// ============================================================
// Core types for Claude Code session data
// ============================================================

/** Represents a discovered Claude Code project */
export interface Project {
  /** Hash-based directory name under ~/.claude/projects/ */
  hash: string;
  /** Resolved filesystem path to the actual project */
  projectPath: string | null;
  /** Whether CLAUDE.md exists in the project root */
  hasClaudeMd: boolean;
  /** Content of CLAUDE.md (if exists) */
  claudeMdContent?: string;
  /** Number of session files */
  sessionCount: number;
  /** Last activity timestamp (ms) */
  lastActive: number;
  /** Whether the project has memory files */
  hasMemory: boolean;
  /** Whether the project has skills */
  hasSkills: boolean;
}

/** Summary info for a session (without full transcript) */
export interface SessionSummary {
  /** Session UUID */
  id: string;
  /** Project hash this session belongs to */
  projectHash: string;
  /** Human-readable session name (if renamed via /rename) */
  name?: string;
  /** File creation time (ms) */
  createdAt: number;
  /** File modification time (ms) */
  updatedAt: number;
  /** File size in bytes */
  fileSize: number;
  /** Number of messages in the conversation */
  messageCount: number;
  /** First user message (as preview) */
  preview?: string;
  /** Model used (if detectable) */
  model?: string;
  /** Working directory used */
  cwd?: string;
}

/** A single message in a session transcript */
export interface SessionMessage {
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Text content */
  content?: string | ContentBlock[];
  /** Tool use info */
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  /** Model info */
  model?: string;
  /** Thinking/reasoning content */
  thinking?: string;
  /** Timestamp if available */
  timestamp?: string;
  /** Token usage */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  /** Stop reason */
  stopReason?: string;
  /** Duration in ms */
  durationMs?: number;
  /** Cost in USD */
  costUsd?: number;
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  thinking?: string;
}

/** Full session with transcript */
export interface Session extends SessionSummary {
  messages: SessionMessage[];
}

/** Memory file info */
export interface MemoryFile {
  name: string;
  path: string;
  content: string;
  updatedAt: number;
}

/** Skill file info */
export interface SkillFile {
  name: string;
  path: string;
  content: string;
  scope: "user" | "project";
}

/** User settings from ~/.claude/settings.json */
export interface ClaudeSettings {
  permissions?: Record<string, unknown>;
  env?: Record<string, string>;
  model?: string;
  cleanupPeriodDays?: number;
  [key: string]: unknown;
}

/** File watcher event */
export interface WatcherEvent {
  type: "session-added" | "session-changed" | "session-removed" | "project-changed";
  projectHash: string;
  sessionId?: string;
  timestamp: number;
}
