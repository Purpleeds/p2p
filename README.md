# P2P Share

Password-locked, browser-to-browser file sharing. The server only does the
WebRTC handshake. Files go directly between the two browsers over an
encrypted data channel and are never uploaded to the server.

## How it works

1. Enter your name, a room name and a password. The first person into a
   room sets its password, and anyone who enters a different password is
   turned away. A room holds up to 10 people.
2. **People** lists everyone in the room.
3. **Share files…** lists a file for the whole room. Anyone can press
   **Download** and get it straight from your browser, with no action from
   you, for as long as your tab stays open.
4. **Send file…** next to a person sends a file to just them. They get an
   **Accept / Decline** prompt, and it only transfers if they accept.

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
