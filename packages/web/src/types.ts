// Shared types — mirrored from server for client use

export interface Project {
  hash: string;
  projectPath: string | null;
  hasClaudeMd: boolean;
  claudeMdContent?: string;
  sessionCount: number;
  lastActive: number;
  hasMemory: boolean;
  hasSkills: boolean;
}

export interface SessionSummary {
  id: string;
  projectHash: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  fileSize: number;
  messageCount: number;
  preview?: string;
  model?: string;
  cwd?: string;
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

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content?: string | ContentBlock[];
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  model?: string;
  thinking?: string;
  timestamp?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  stopReason?: string;
  durationMs?: number;
  costUsd?: number;
}

export interface Session extends SessionSummary {
  messages: SessionMessage[];
}

export interface MemoryFile {
  name: string;
  path: string;
  content: string;
  updatedAt: number;
}

export interface SkillFile {
  name: string;
  path: string;
  content: string;
  scope: "user" | "project";
}

export interface GlobalStats {
  totalProjects: number;
  totalSessions: number;
  projectsWithClaudeMd: number;
  totalSizeBytes: number;
}
