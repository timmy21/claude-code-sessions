import { watch } from "chokidar";
import { Server as SocketIOServer } from "socket.io";
import { PATHS } from "../config.js";
import type { WatcherEvent } from "../types.js";
import { basename, extname } from "node:path";
import { existsSync } from "node:fs";

/**
 * File watcher service that monitors ~/.claude/projects/ for changes
 * and emits events via Socket.IO
 */
export function createFileWatcher(io: SocketIOServer): () => void {
  if (!existsSync(PATHS.projectsDir)) {
    console.log("[watcher] Projects directory not found, skipping watcher setup");
    return () => {};
  }

  const watcher = watch(PATHS.projectsDir, {
    ignoreInitial: true,
    persistent: true,
    depth: 3,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  const emitEvent = (event: WatcherEvent) => {
    io.emit("session-change", event);
  };

  watcher
    .on("add", (path) => {
      if (extname(path) === ".jsonl") {
        const parts = path.split("/");
        const projectHash = parts[parts.length - 2];
        const sessionId = basename(path, ".jsonl");
        emitEvent({
          type: "session-added",
          projectHash,
          sessionId,
          timestamp: Date.now(),
        });
      }
    })
    .on("change", (path) => {
      if (extname(path) === ".jsonl") {
        const parts = path.split("/");
        const projectHash = parts[parts.length - 2];
        const sessionId = basename(path, ".jsonl");
        emitEvent({
          type: "session-changed",
          projectHash,
          sessionId,
          timestamp: Date.now(),
        });
      }
    })
    .on("unlink", (path) => {
      if (extname(path) === ".jsonl") {
        const parts = path.split("/");
        const projectHash = parts[parts.length - 2];
        const sessionId = basename(path, ".jsonl");
        emitEvent({
          type: "session-removed",
          projectHash,
          sessionId,
          timestamp: Date.now(),
        });
      }
    })
    .on("error", (error) => {
      console.error("[watcher] Error:", error);
    });

  console.log(`[watcher] Watching ${PATHS.projectsDir}`);

  return () => {
    watcher.close();
  };
}
