const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

const rooms = new Map();
const ARENA = { width: 900, height: 560 };
const MAX_PLAYERS = 8;
const ROUND_MS = 90_000;
const COLORS = ["#63e6ff", "#ff5bd6", "#ffe66d", "#a8ff60", "#b49bff", "#ff9466", "#72ffc6", "#ff7b9c"];

function code() { return crypto.randomBytes(3).toString("hex").toUpperCase(); }
function makeRoom() {
  let id;
  do { id = code(); } while (rooms.has(id));
  const room = { id, players: new Map(), stars: [], started: false, endsAt: 0, timer: null };
  for (let i = 0; i < 18; i++) room.stars.push(newStar());
  rooms.set(id, room);
  return room;
}
function newStar() {
  return { id: crypto.randomBytes(5).toString("hex"), x: 28 + Math.random() * (ARENA.width - 56),
    y: 28 + Math.random() * (ARENA.height - 56) };
}
function publicState(room) {
  return { roomId: room.id, started: room.started, endsAt: room.endsAt,
    width: ARENA.width, height: ARENA.height, stars: room.stars,
    players: [...room.players.values()].map(({id, name, x, y, score, color}) => ({id, name, x, y, score, color})) };
}
function broadcast(room) { io.to(room.id).emit("state", publicState(room)); }
function finish(room) {
  if (!room.started) return;
  room.started = false;
  clearInterval(room.timer);
  room.timer = null;
  const ranking = [...room.players.values()].sort((a,b) => b.score - a.score)
    .map((p,i) => ({ name: p.name, score: p.score, rank: i + 1 }));
  io.to(room.id).emit("roundOver", ranking);
  broadcast(room);
}
function startRound(room) {
  if (room.started || room.players.size < 2) return;
  room.started = true;
  room.endsAt = Date.now() + ROUND_MS;
  room.stars = Array.from({length:18}, newStar);
  for (const p of room.players.values()) p.score = 0;
  io.to(room.id).emit("roundStarted", { endsAt: room.endsAt });
  room.timer = setInterval(() => {
    if (Date.now() >= room.endsAt) finish(room);
    else broadcast(room);
  }, 250);
  broadcast(room);
}

io.on("connection", socket => {
  socket.on("createRoom", ({name}, reply) => {
    const clean = String(name || "Player").trim().slice(0,16) || "Player";
    const room = makeRoom();
    joinRoom(socket, room, clean);
    reply?.({ok:true, roomId:room.id, playerId:socket.id});
  });
  socket.on("joinRoom", ({roomId, name}, reply) => {
    const id = String(roomId || "").trim().toUpperCase();
    const room = rooms.get(id);
    if (!room) return reply?.({ok:false, error:"Room not found. Check the code."});
    if (room.players.size >= MAX_PLAYERS) return reply?.({ok:false, error:"This room is full (8 players max)."});
    if (room.started) return reply?.({ok:false, error:"A round is in progress. Try again after it ends."});
    joinRoom(socket, room, String(name || "Player").trim().slice(0,16) || "Player");
    reply?.({ok:true, roomId:room.id, playerId:socket.id});
  });
  function joinRoom(sock, room, name) {
    sock.join(room.id);
    const index = room.players.size % COLORS.length;
    room.players.set(sock.id, {id:sock.id, name, x:80 + Math.random()*740, y:80 + Math.random()*400,
      score:0, color:COLORS[index], lastMove:0});
    sock.data.roomId = room.id;
    sock.emit("joined", {roomId:room.id, playerId:sock.id});
    broadcast(room);
  }
  socket.on("move", ({x,y}) => {
    const room = rooms.get(socket.data.roomId);
    const p = room?.players.get(socket.id);
    if (!room || !p || !room.started) return;
    // Server validates and clamps all movement.
    const now = Date.now();
    if (now - p.lastMove < 28) return;
    p.lastMove = now;
    p.x = Math.max(14, Math.min(ARENA.width-14, Number(x) || p.x));
    p.y = Math.max(14, Math.min(ARENA.height-14, Number(y) || p.y));
    for (let i = room.stars.length - 1; i >= 0; i--) {
      const s = room.stars[i];
      if (Math.hypot(p.x-s.x, p.y-s.y) < 25) {
        p.score += 1;
        room.stars.splice(i, 1, newStar());
        socket.emit("collected", {score:p.score});
      }
    }
    broadcast(room);
  });
  socket.on("startRound", () => {
    const room = rooms.get(socket.data.roomId);
    if (room) startRound(room);
  });
  socket.on("disconnect", () => {
    const id = socket.data.roomId, room = rooms.get(id);
    if (!room) return;
    room.players.delete(socket.id);
    if (!room.players.size) {
      clearInterval(room.timer);
      rooms.delete(id);
    } else {
      broadcast(room);
      if (room.players.size < 2 && room.started) finish(room);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Neon Arena running on port ${PORT}`));