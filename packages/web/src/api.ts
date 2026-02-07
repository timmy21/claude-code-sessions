import type {
  Project,
  SessionSummary,
  Session,
  MemoryFile,
  SkillFile,
  GlobalStats,
} from "./types";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// Projects
export const fetchProjects = () => fetchJson<Project[]>("/projects");
export const fetchProject = (hash: string) => fetchJson<Project>(`/projects/${hash}`);
export const fetchClaudeMd = (hash: string) =>
  fetchJson<{ content: string; path: string }>(`/projects/${hash}/claude-md`);
export const fetchMemoryFiles = (hash: string) =>
  fetchJson<MemoryFile[]>(`/projects/${hash}/memory`);
export const fetchSkills = (hash: string) =>
  fetchJson<SkillFile[]>(`/projects/${hash}/skills`);

// Sessions
export const fetchSessions = (hash: string) =>
  fetchJson<SessionSummary[]>(`/projects/${hash}/sessions`);
export const fetchSession = (hash: string, id: string) =>
  fetchJson<Session>(`/projects/${hash}/sessions/${id}`);
export const deleteSession = (hash: string, id: string) =>
  fetchJson<{ deleted: boolean }>(`/projects/${hash}/sessions/${id}`, {
    method: "DELETE",
  });
export const batchDeleteSessions = (hash: string, sessionIds: string[]) =>
  fetchJson<{ deleted: string[]; failed: string[] }>(
    `/projects/${hash}/sessions/batch-delete`,
    { method: "POST", body: JSON.stringify({ sessionIds }) },
  );

// User-level
export const fetchStats = () => fetchJson<GlobalStats>("/stats");
export const fetchUserClaudeMd = () => fetchJson<string | null>("/user-claude-md");
export const fetchSettings = () => fetchJson<Record<string, unknown> | null>("/settings");
