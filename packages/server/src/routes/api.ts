import { Router, type Request, type Response } from "express";
import * as claudeData from "../services/claude-data.js";

const router: ReturnType<typeof Router> = Router();

// ============================================================
// Projects
// ============================================================

/** GET /api/projects — list all projects */
router.get("/projects", async (_req, res) => {
  try {
    const projects = await claudeData.listProjects();
    res.json({ data: projects });
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

/** GET /api/projects/:hash — get single project */
router.get("/projects/:hash", async (req, res) => {
  try {
    const project = await claudeData.getProject(req.params.hash);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ data: project });
  } catch (err) {
    console.error("Error getting project:", err);
    res.status(500).json({ error: "Failed to get project" });
  }
});

/** GET /api/projects/:hash/claude-md — get CLAUDE.md content */
router.get("/projects/:hash/claude-md", async (req, res) => {
  try {
    const claudeMd = await claudeData.getClaudeMd(req.params.hash);
    if (!claudeMd) {
      res.status(404).json({ error: "CLAUDE.md not found" });
      return;
    }
    res.json({ data: claudeMd });
  } catch (err) {
    console.error("Error getting CLAUDE.md:", err);
    res.status(500).json({ error: "Failed to get CLAUDE.md" });
  }
});

/** GET /api/projects/:hash/memory — get memory files */
router.get("/projects/:hash/memory", async (req, res) => {
  try {
    const files = await claudeData.getMemoryFiles(req.params.hash);
    res.json({ data: files });
  } catch (err) {
    console.error("Error getting memory files:", err);
    res.status(500).json({ error: "Failed to get memory files" });
  }
});

/** GET /api/projects/:hash/skills — get skills */
router.get("/projects/:hash/skills", async (req, res) => {
  try {
    const skills = await claudeData.getSkills(req.params.hash);
    res.json({ data: skills });
  } catch (err) {
    console.error("Error getting skills:", err);
    res.status(500).json({ error: "Failed to get skills" });
  }
});

// ============================================================
// Sessions
// ============================================================

/** GET /api/projects/:hash/sessions — list sessions */
router.get("/projects/:hash/sessions", async (req, res) => {
  try {
    const sessions = await claudeData.listSessions(req.params.hash);
    res.json({ data: sessions });
  } catch (err) {
    console.error("Error listing sessions:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

/** GET /api/projects/:hash/sessions/:id — get full session */
router.get("/projects/:hash/sessions/:id", async (req, res) => {
  try {
    const session = await claudeData.getSession(req.params.hash, req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ data: session });
  } catch (err) {
    console.error("Error getting session:", err);
    res.status(500).json({ error: "Failed to get session" });
  }
});

/** DELETE /api/projects/:hash/sessions/:id — delete session */
router.delete("/projects/:hash/sessions/:id", async (req, res) => {
  try {
    const ok = await claudeData.deleteSession(req.params.hash, req.params.id);
    if (!ok) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error("Error deleting session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

/** POST /api/projects/:hash/sessions/batch-delete — delete multiple sessions */
router.post("/projects/:hash/sessions/batch-delete", async (req, res) => {
  try {
    const { sessionIds } = req.body as { sessionIds: string[] };
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      res.status(400).json({ error: "sessionIds array is required" });
      return;
    }
    const result = await claudeData.deleteSessions(req.params.hash, sessionIds);
    res.json({ data: result });
  } catch (err) {
    console.error("Error batch-deleting sessions:", err);
    res.status(500).json({ error: "Failed to delete sessions" });
  }
});

// ============================================================
// User-level data
// ============================================================

/** GET /api/settings — get user settings */
router.get("/settings", async (_req, res) => {
  try {
    const settings = await claudeData.getUserSettings();
    res.json({ data: settings });
  } catch (err) {
    console.error("Error getting settings:", err);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

/** GET /api/user-claude-md — get user-level CLAUDE.md */
router.get("/user-claude-md", async (_req, res) => {
  try {
    const content = await claudeData.getUserClaudeMd();
    res.json({ data: content });
  } catch (err) {
    console.error("Error getting user CLAUDE.md:", err);
    res.status(500).json({ error: "Failed to get user CLAUDE.md" });
  }
});

/** GET /api/stats — get global statistics */
router.get("/stats", async (_req, res) => {
  try {
    const stats = await claudeData.getGlobalStats();
    res.json({ data: stats });
  } catch (err) {
    console.error("Error getting stats:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
