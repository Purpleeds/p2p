# P2P Share

Password-locked, browser-to-browser file sharing. The server only does the
WebRTC handshake. Files go directly between the two browsers over an
encrypted data channel and are never uploaded to the server.

## How it works

1. Person A opens the site and enters a room name and a password. Because
   they are first in, that password becomes the room's password.
2. Person B enters the same room name and password. A wrong password is
   rejected. A room holds at most 2 people.
3. Once they are connected, either person can pick files and press **Send**.

A room disappears when everyone has left.

## Run locally

```bash
npm install
npm start   # http://localhost:3000
```

## Deploy to Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. It picks up
   `render.yaml`.
   Or choose **New → Web Service** with build command `npm install` and
   start command `npm start`.
3. Open the `https://<your-app>.onrender.com` URL on both devices.

## Notes

- Only a public STUN server is used, so a few strict networks (some
  corporate or mobile networks) can't connect directly. To support those,
  add a TURN server to `iceServers` in `public/index.html`.
- Received files are held in memory before you save them, so very large
  files (several GB) may not work well.
- Render's free plan sleeps when idle, so the first visit can take around
  30 seconds.
