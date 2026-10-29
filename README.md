# Neon Arena — real-time multiplayer game

A room-based browser game built with Node.js, Express and Socket.IO. Players on different devices can join the same room and collect stars in a 90-second round.

## Requirements
- Node.js 18 or newer
- Internet connection for installation and public deployment

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000` on your computer.

To test from a phone on the same Wi-Fi, find your computer's local IP address and open `http://YOUR_LOCAL_IP:3000` on the phone. Both devices must be on the same network. For internet play, deploy the project to a public Node.js host.

## Deploy publicly
1. Create a GitHub repository and upload these files.
2. Create a new **Node.js web service** on a host that supports persistent Node.js processes and WebSocket/Socket.IO connections (for example, Render or Railway).
3. Set the build command to `npm install` and the start command to `npm start`.
4. Deploy and open the HTTPS URL provided by the host.
5. Share the URL with friends. One player creates a room and shares the six-character room code; others enter the same code.

The service must keep the Node process running and support WebSockets. A static-only host cannot run this server as-is.

## Controls
- Desktop: Arrow keys or WASD
- Mobile: on-screen direction buttons
- Collect stars to score points. Highest score after 90 seconds wins.
- Two to eight players per room.

## Notes
- Room state is held in server memory; restarting the service clears rooms.
- This starter project does not include accounts, persistent rankings, moderation, or distributed multi-server scaling.
- For production use, add rate limits, stronger input validation, reconnect handling, and a persistent/shared game store if running multiple server instances.
