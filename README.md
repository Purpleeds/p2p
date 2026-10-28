# P2P Share

Password-locked, browser-to-browser file sharing. The server connects
people. Files go directly between browsers over an encrypted WebRTC data
channel, and only go through the server as a fallback when a direct
connection isn't possible. Files are never stored on the server.

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

- Files go directly between browsers when possible. If two browsers can't
  reach each other within about 8 seconds (common on mobile data and some
  Wi-Fi networks), they automatically send through the server instead, and
  the people list shows "via server". Relayed files pass through the
  server's memory in small pieces and are never saved, but they do count
  toward your Render bandwidth.
- Received files are held in memory before you save them, so very large
  files (several GB) may not work well.
- Render's free plan sleeps when idle, so the first visit can take around
  30 seconds.
