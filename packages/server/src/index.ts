import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import apiRouter from "./routes/api.js";
import { createFileWatcher } from "./services/file-watcher.js";
import { CORS_ORIGIN, SERVER_PORT, PATHS } from "./config.js";

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time file watching
const io = new SocketIOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// API routes
app.use("/api", apiRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", configDir: PATHS.configDir });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

// Start file watcher
const stopWatcher = createFileWatcher(io);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[server] Shutting down...");
  stopWatcher();
  httpServer.close();
  process.exit(0);
});

// Start server
httpServer.listen(SERVER_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Claude Code Session Manager — API Server       ║
║   http://localhost:${SERVER_PORT}                         ║
║   Config: ${PATHS.configDir}              ║
╚══════════════════════════════════════════════════╝
  `);
});
