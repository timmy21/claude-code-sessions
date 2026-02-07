import { readdir, readFile, stat, rm } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { existsSync } from "node:fs";
import { PATHS } from "../config.js";
import type {
  Project,
  SessionSummary,
  Session,
  SessionMessage,
  MemoryFile,
  SkillFile,
  ClaudeSettings,
  ContentBlock,
} from "../types.js";

// ============================================================
// Claude Data Service — reads & manages Claude Code local data
// ============================================================

/**
 * Attempt to resolve a project hash directory back to a real project path.
 * Claude Code uses the git root or cwd path to create the hash.
 * We try to read from the JSONL files' cwd field, or from user config.
 */
async function resolveProjectPath(
  hashDir: string,
): Promise<string | null> {
  // Strategy 1: Read from the first session file to find the cwd
  try {
    const entries = await readdir(hashDir);
    const jsonlFiles = entries.filter((e) => e.endsWith(".jsonl"));
    if (jsonlFiles.length > 0) {
      const filePath = join(hashDir, jsonlFiles[0]);
      const content = await readFile(filePath, "utf-8");
      const firstLine = content.split("\n").find((l) => l.trim());
      if (firstLine) {
        const parsed = JSON.parse(firstLine);
        // Look for cwd in different possible locations
        if (parsed.cwd) return parsed.cwd;
        if (parsed.message?.cwd) return parsed.message.cwd;
        // Some formats embed the project path in a system message
        if (parsed.role === "system" && typeof parsed.content === "string") {
          const match = parsed.content.match(/(?:directory|cwd|project)[:\s]+([/~][^\s"']+)/i);
          if (match) return match[1];
        }
      }
    }
  } catch {
    // Ignore
  }

  // Strategy 2: Try to find a mapping in ~/.claude.json
  try {
    if (existsSync(PATHS.userConfigFile)) {
      const config = JSON.parse(await readFile(PATHS.userConfigFile, "utf-8"));
      // Look through project settings for path references
      if (config.projects) {
        for (const [path, _settings] of Object.entries(config.projects)) {
          // Check if any project path hashes to this directory name
          const dirName = basename(hashDir);
          if (path.includes(dirName) || dirName.includes(basename(path))) {
            return path;
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  // Strategy 3: Use the hash directory name itself — it may contain the path
  // Claude Code encodes the path in the directory name with some encoding
  const dirName = basename(hashDir);

  // Try URL-decoding the directory name (Claude encodes / as %2F or similar)
  try {
    const decoded = decodeURIComponent(dirName.replace(/\+/g, " "));
    if (decoded.startsWith("/") && existsSync(decoded)) {
      return decoded;
    }
  } catch {
    // Not URL-encoded
  }

  // Try replacing - with / to recover the path
  const possiblePath = "/" + dirName.replace(/-/g, "/");
  if (existsSync(possiblePath)) {
    return possiblePath;
  }

  return null;
}

/**
 * Check if a project path has a CLAUDE.md file
 */
async function checkClaudeMd(
  projectPath: string | null,
): Promise<{ exists: boolean; content?: string }> {
  if (!projectPath) return { exists: false };

  const candidates = [
    join(projectPath, "CLAUDE.md"),
    join(projectPath, ".claude", "CLAUDE.md"),
  ];

  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, "utf-8");
      return { exists: true, content };
    } catch {
      continue;
    }
  }

  return { exists: false };
}

// ============================================================
// Public API
// ============================================================

/**
 * List all discovered projects with metadata
 */
export async function listProjects(): Promise<Project[]> {
  if (!existsSync(PATHS.projectsDir)) return [];

  const entries = await readdir(PATHS.projectsDir, { withFileTypes: true });
  const projectDirs = entries.filter((e) => e.isDirectory());

  const projects = await Promise.all(
    projectDirs.map(async (dir) => {
      const hashDir = join(PATHS.projectsDir, dir.name);
      const projectPath = await resolveProjectPath(hashDir);
      const claudeMd = await checkClaudeMd(projectPath);

      // Count session files
      const files = await readdir(hashDir).catch(() => []);
      const sessionFiles = files.filter((f) => f.endsWith(".jsonl"));

      // Check last activity
      let lastActive = 0;
      for (const sf of sessionFiles) {
        try {
          const s = await stat(join(hashDir, sf));
          if (s.mtimeMs > lastActive) lastActive = s.mtimeMs;
        } catch {
          // Ignore
        }
      }

      // Check memory directory
      const hasMemory = existsSync(join(hashDir, "memory"));

      // Check skills
      const hasProjectSkills =
        projectPath ? existsSync(join(projectPath, ".claude", "skills")) : false;
      const hasUserSkills = existsSync(PATHS.userSkillsDir);

      return {
        hash: dir.name,
        projectPath,
        hasClaudeMd: claudeMd.exists,
        claudeMdContent: claudeMd.content,
        sessionCount: sessionFiles.length,
        lastActive,
        hasMemory,
        hasSkills: hasProjectSkills || hasUserSkills,
      } satisfies Project;
    }),
  );

  // Sort by last active (most recent first)
  return projects.sort((a, b) => b.lastActive - a.lastActive);
}

/**
 * Get a single project by hash
 */
export async function getProject(hash: string): Promise<Project | null> {
  const projects = await listProjects();
  return projects.find((p) => p.hash === hash) ?? null;
}

/**
 * Parse a JSONL session file into structured messages
 */
function parseSessionMessages(content: string): SessionMessage[] {
  const lines = content.split("\n").filter((l) => l.trim());
  const messages: SessionMessage[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      // Handle different JSONL formats
      const msg: SessionMessage = {
        role: parsed.role || "system",
      };

      // Content
      if (typeof parsed.content === "string") {
        msg.content = parsed.content;
      } else if (Array.isArray(parsed.content)) {
        msg.content = parsed.content as ContentBlock[];
      } else if (parsed.message) {
        // Wrapped format
        msg.role = parsed.message.role || msg.role;
        msg.content = parsed.message.content;
      }

      // Tool info
      if (parsed.tool_name || parsed.toolName) {
        msg.toolName = parsed.tool_name || parsed.toolName;
      }
      if (parsed.tool_input || parsed.toolInput) {
        msg.toolInput = parsed.tool_input || parsed.toolInput;
      }
      if (parsed.tool_result !== undefined || parsed.toolResult !== undefined) {
        msg.toolResult = parsed.tool_result ?? parsed.toolResult;
      }

      // Model
      if (parsed.model) msg.model = parsed.model;

      // Thinking
      if (parsed.thinking) msg.thinking = parsed.thinking;

      // Timestamp
      if (parsed.timestamp) msg.timestamp = parsed.timestamp;

      // Usage
      if (parsed.usage) msg.usage = parsed.usage;

      // Stop reason
      if (parsed.stop_reason || parsed.stopReason) {
        msg.stopReason = parsed.stop_reason || parsed.stopReason;
      }

      // Duration
      if (parsed.duration_ms || parsed.durationMs) {
        msg.durationMs = parsed.duration_ms || parsed.durationMs;
      }

      // Cost
      if (parsed.cost_usd || parsed.costUsd) {
        msg.costUsd = parsed.cost_usd || parsed.costUsd;
      }

      // cwd — extract if present, we don't add to message but can be read
      messages.push(msg);
    } catch {
      // Skip malformed lines
    }
  }

  return messages;
}

/**
 * List sessions for a project
 */
export async function listSessions(projectHash: string): Promise<SessionSummary[]> {
  const hashDir = join(PATHS.projectsDir, projectHash);
  if (!existsSync(hashDir)) return [];

  const entries = await readdir(hashDir).catch(() => []);
  const sessionFiles = entries.filter((f) => f.endsWith(".jsonl"));

  const sessions = await Promise.all(
    sessionFiles.map(async (file) => {
      const filePath = join(hashDir, file);
      const fileStats = await stat(filePath);
      const sessionId = basename(file, ".jsonl");

      // Quick parse for summary info (read first & last few lines)
      let messageCount = 0;
      let preview: string | undefined;
      let model: string | undefined;
      let cwd: string | undefined;

      try {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim());
        messageCount = lines.length;

        // Extract info from first few messages
        for (const line of lines.slice(0, 10)) {
          try {
            const parsed = JSON.parse(line);

            if (!preview && (parsed.role === "user" || parsed.message?.role === "user")) {
              const text = typeof parsed.content === "string"
                ? parsed.content
                : parsed.message?.content;
              if (typeof text === "string") {
                preview = text.slice(0, 200);
              } else if (Array.isArray(text)) {
                const textBlock = text.find(
                  (b: ContentBlock) => b.type === "text" && b.text,
                );
                if (textBlock) preview = textBlock.text!.slice(0, 200);
              }
            }

            if (!model && parsed.model) model = parsed.model;
            if (!cwd && (parsed.cwd || parsed.message?.cwd)) {
              cwd = parsed.cwd || parsed.message?.cwd;
            }
          } catch {
            // Skip
          }
        }
      } catch {
        // Ignore read errors
      }

      return {
        id: sessionId,
        projectHash,
        createdAt: fileStats.birthtimeMs || fileStats.ctimeMs,
        updatedAt: fileStats.mtimeMs,
        fileSize: fileStats.size,
        messageCount,
        preview,
        model,
        cwd,
      } satisfies SessionSummary;
    }),
  );

  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get full session with transcript
 */
export async function getSession(
  projectHash: string,
  sessionId: string,
): Promise<Session | null> {
  const filePath = join(PATHS.projectsDir, projectHash, `${sessionId}.jsonl`);
  if (!existsSync(filePath)) return null;

  const [content, fileStats] = await Promise.all([
    readFile(filePath, "utf-8"),
    stat(filePath),
  ]);

  const messages = parseSessionMessages(content);

  // Extract summary info
  let preview: string | undefined;
  let model: string | undefined;
  let cwd: string | undefined;

  for (const msg of messages.slice(0, 10)) {
    if (!preview && msg.role === "user") {
      if (typeof msg.content === "string") {
        preview = msg.content.slice(0, 200);
      } else if (Array.isArray(msg.content)) {
        const textBlock = msg.content.find((b) => b.type === "text" && b.text);
        if (textBlock) preview = textBlock.text!.slice(0, 200);
      }
    }
    if (!model && msg.model) model = msg.model;
  }

  return {
    id: sessionId,
    projectHash,
    createdAt: fileStats.birthtimeMs || fileStats.ctimeMs,
    updatedAt: fileStats.mtimeMs,
    fileSize: fileStats.size,
    messageCount: messages.length,
    preview,
    model,
    cwd,
    messages,
  };
}

/**
 * Delete a session
 */
export async function deleteSession(
  projectHash: string,
  sessionId: string,
): Promise<boolean> {
  const filePath = join(PATHS.projectsDir, projectHash, `${sessionId}.jsonl`);
  if (!existsSync(filePath)) return false;

  await rm(filePath);

  // Also delete subagent directory if exists
  const subagentDir = join(PATHS.projectsDir, projectHash, sessionId);
  if (existsSync(subagentDir)) {
    await rm(subagentDir, { recursive: true });
  }

  return true;
}

/**
 * Delete multiple sessions
 */
export async function deleteSessions(
  projectHash: string,
  sessionIds: string[],
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];

  await Promise.all(
    sessionIds.map(async (id) => {
      const ok = await deleteSession(projectHash, id);
      if (ok) deleted.push(id);
      else failed.push(id);
    }),
  );

  return { deleted, failed };
}

/**
 * Get CLAUDE.md content for a project
 */
export async function getClaudeMd(
  projectHash: string,
): Promise<{ content: string; path: string } | null> {
  const project = await getProject(projectHash);
  if (!project?.projectPath) return null;

  const candidates = [
    join(project.projectPath, "CLAUDE.md"),
    join(project.projectPath, ".claude", "CLAUDE.md"),
  ];

  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, "utf-8");
      return { content, path: candidate };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get memory files for a project
 */
export async function getMemoryFiles(projectHash: string): Promise<MemoryFile[]> {
  const memoryDir = join(PATHS.projectsDir, projectHash, "memory");
  if (!existsSync(memoryDir)) return [];

  const entries = await readdir(memoryDir).catch(() => []);
  const memoryFiles: MemoryFile[] = [];

  for (const entry of entries) {
    if (extname(entry) === ".md") {
      const filePath = join(memoryDir, entry);
      try {
        const [content, fileStats] = await Promise.all([
          readFile(filePath, "utf-8"),
          stat(filePath),
        ]);
        memoryFiles.push({
          name: basename(entry, ".md"),
          path: filePath,
          content,
          updatedAt: fileStats.mtimeMs,
        });
      } catch {
        // Skip
      }
    }
  }

  return memoryFiles.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get skills (user-level + project-level)
 */
export async function getSkills(projectHash: string): Promise<SkillFile[]> {
  const skills: SkillFile[] = [];

  // User-level skills
  if (existsSync(PATHS.userSkillsDir)) {
    const entries = await readdir(PATHS.userSkillsDir).catch(() => []);
    for (const entry of entries) {
      if (extname(entry) === ".md") {
        const filePath = join(PATHS.userSkillsDir, entry);
        try {
          const content = await readFile(filePath, "utf-8");
          skills.push({
            name: basename(entry, ".md"),
            path: filePath,
            content,
            scope: "user",
          });
        } catch {
          // Skip
        }
      }
    }
  }

  // Project-level skills
  const project = await getProject(projectHash);
  if (project?.projectPath) {
    const projectSkillsDir = join(project.projectPath, ".claude", "skills");
    if (existsSync(projectSkillsDir)) {
      const entries = await readdir(projectSkillsDir).catch(() => []);
      for (const entry of entries) {
        if (extname(entry) === ".md") {
          const filePath = join(projectSkillsDir, entry);
          try {
            const content = await readFile(filePath, "utf-8");
            skills.push({
              name: basename(entry, ".md"),
              path: filePath,
              content,
              scope: "project",
            });
          } catch {
            // Skip
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Get user-level settings
 */
export async function getUserSettings(): Promise<ClaudeSettings | null> {
  try {
    const content = await readFile(PATHS.settingsFile, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get user-level CLAUDE.md
 */
export async function getUserClaudeMd(): Promise<string | null> {
  try {
    return await readFile(PATHS.userClaudeMd, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get global stats
 */
export async function getGlobalStats(): Promise<{
  totalProjects: number;
  totalSessions: number;
  projectsWithClaudeMd: number;
  totalSizeBytes: number;
}> {
  const projects = await listProjects();
  let totalSessions = 0;
  let projectsWithClaudeMd = 0;
  let totalSizeBytes = 0;

  for (const project of projects) {
    totalSessions += project.sessionCount;
    if (project.hasClaudeMd) projectsWithClaudeMd++;
  }

  // Calculate total size
  if (existsSync(PATHS.projectsDir)) {
    const calcSize = async (dir: string): Promise<number> => {
      let size = 0;
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isFile()) {
          const s = await stat(fullPath);
          size += s.size;
        } else if (entry.isDirectory()) {
          size += await calcSize(fullPath);
        }
      }
      return size;
    };
    totalSizeBytes = await calcSize(PATHS.projectsDir);
  }

  return {
    totalProjects: projects.length,
    totalSessions,
    projectsWithClaudeMd,
    totalSizeBytes,
  };
}
