import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Paths to Claude Code's local data.
 * Respects CLAUDE_CONFIG_DIR if set, otherwise defaults to ~/.claude/
 */
const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");

export const PATHS = {
  /** Root config directory (~/.claude/) */
  configDir,
  /** Projects directory (~/.claude/projects/) — contains per-project session data */
  projectsDir: join(configDir, "projects"),
  /** User-level settings (~/.claude/settings.json) */
  settingsFile: join(configDir, "settings.json"),
  /** User-level CLAUDE.md (~/.claude/CLAUDE.md) */
  userClaudeMd: join(configDir, "CLAUDE.md"),
  /** User-level skills (~/.claude/skills/) */
  userSkillsDir: join(configDir, "skills"),
  /** User-level rules (~/.claude/rules/) */
  userRulesDir: join(configDir, "rules"),
  /** Root user config (~/.claude.json) */
  userConfigFile: join(homedir(), ".claude.json"),
} as const;

export const SERVER_PORT = parseInt(process.env.PORT || "3581", 10);
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
