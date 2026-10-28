// Signaling server: serves the web page, tracks who is in each
// password-protected room, and relays WebRTC handshake messages between
// peers. Files never pass through here — they travel directly between browsers.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PEERS = 10;
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

// room name -> { salt, hash, peers: Map<id, ws> }
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
  room.peers.delete(ws.id);
  for (const peer of room.peers.values()) send(peer, { type: 'peer-left', id: ws.id });
  if (room.peers.size === 0) rooms.delete(ws.room);
  ws.room = null;
}

wss.on('connection', (ws) => {
  ws.id = crypto.randomUUID();
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const roomName = String(msg.room || '').trim().slice(0, 64);
      const name = String(msg.name || '').trim().slice(0, 32);
      const password = String(msg.password || '');
      if (!roomName || !password || !name) return send(ws, { type: 'error', message: 'Name, room and password are required.' });
      if (ws.room) leave(ws);

      let room = rooms.get(roomName);
      if (!room) {
        // First peer creates the room and sets its password.
        const salt = crypto.randomBytes(16);
        room = { salt, hash: hashPassword(password, salt), peers: new Map() };
        rooms.set(roomName, room);
      } else if (!crypto.timingSafeEqual(room.hash, hashPassword(password, room.salt))) {
        return send(ws, { type: 'error', message: 'Wrong password.' });
      } else if (room.peers.size >= MAX_PEERS) {
        return send(ws, { type: 'error', message: 'Room is full.' });
      }

      const others = [...room.peers.values()].map((p) => ({ id: p.id, name: p.name }));
      room.peers.set(ws.id, ws);
      ws.room = roomName;
      ws.name = name;
      send(ws, { type: 'joined', id: ws.id, peers: others });
      for (const peer of room.peers.values()) if (peer !== ws) send(peer, { type: 'peer-joined', id: ws.id, name });
      return;
    }

    if (msg.type === 'signal' && ws.room) {
      const target = rooms.get(ws.room)?.peers.get(msg.to);
      if (target) send(target, { type: 'signal', from: ws.id, data: msg.data });
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
