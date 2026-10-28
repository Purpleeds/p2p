// Signaling server: serves the web page and relays WebRTC handshake messages
// between the two peers of a password-protected room. Files never pass
// through here — they travel directly between browsers.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

// room name -> { salt, hash, peers: Set<ws> }
const rooms = new Map();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(INDEX);
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function leave(ws) {
  const room = rooms.get(ws.room);
  if (!room) return;
  room.peers.delete(ws);
  for (const peer of room.peers) send(peer, { type: 'peer-left' });
  if (room.peers.size === 0) rooms.delete(ws.room);
  ws.room = null;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const name = String(msg.room || '').trim().slice(0, 64);
      const password = String(msg.password || '');
      if (!name || !password) return send(ws, { type: 'error', message: 'Room and password are required.' });
      if (ws.room) leave(ws);

      let room = rooms.get(name);
      if (!room) {
        // First peer creates the room and sets its password.
        const salt = crypto.randomBytes(16);
        room = { salt, hash: hashPassword(password, salt), peers: new Set() };
        rooms.set(name, room);
      } else if (!crypto.timingSafeEqual(room.hash, hashPassword(password, room.salt))) {
        return send(ws, { type: 'error', message: 'Wrong password.' });
      } else if (room.peers.size >= 2) {
        return send(ws, { type: 'error', message: 'Room is full.' });
      }

      room.peers.add(ws);
      ws.room = name;
      send(ws, { type: 'joined', peers: room.peers.size });
      // The peer already waiting starts the WebRTC handshake.
      for (const peer of room.peers) if (peer !== ws) send(peer, { type: 'peer-joined' });
      return;
    }

    if (msg.type === 'signal' && ws.room) {
      const room = rooms.get(ws.room);
      if (!room) return;
      for (const peer of room.peers) if (peer !== ws) send(peer, { type: 'signal', data: msg.data });
    }
  });

  ws.on('close', () => leave(ws));
});

// Keep connections alive through Render's proxy and drop dead ones.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
