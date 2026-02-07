import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  FileText,
  Brain,
  Sparkles,
  CheckSquare,
  Square,
} from "lucide-react";
import { useAsync, useSocket } from "../hooks";
import {
  fetchProject,
  fetchSessions,
  fetchClaudeMd,
  fetchMemoryFiles,
  fetchSkills,
  deleteSession,
  batchDeleteSessions,
} from "../api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Card,
  Badge,
  ConfirmDialog,
  SearchInput,
} from "../components/ui";
import MarkdownViewer from "../components/MarkdownViewer";
import { projectName, timeAgo, formatDate, formatBytes, truncate, shortModel } from "../utils";

type Tab = "sessions" | "claude-md" | "memory" | "skills";

export default function ProjectDetailPage() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("sessions");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const project = useAsync(() => fetchProject(hash!), [hash]);
  const sessions = useAsync(() => fetchSessions(hash!), [hash]);
  const claudeMd = useAsync(() => fetchClaudeMd(hash!).catch(() => null), [hash]);
  const memory = useAsync(() => fetchMemoryFiles(hash!), [hash]);
  const skills = useAsync(() => fetchSkills(hash!), [hash]);

  // Real-time updates
  const { onSessionChange } = useSocket();
  useSocket(); // Initialize
  onSessionChange?.((event) => {
    if (event.projectHash === hash) {
      sessions.refresh();
    }
  });

  const handleDeleteSession = useCallback(async () => {
    if (!deleteTarget || !hash) return;
    await deleteSession(hash, deleteTarget);
    setDeleteTarget(null);
    sessions.refresh();
  }, [deleteTarget, hash, sessions]);

  const handleBatchDelete = useCallback(async () => {
    if (!hash || selected.size === 0) return;
    await batchDeleteSessions(hash, [...selected]);
    setSelected(new Set());
    setBatchDeleteOpen(false);
    sessions.refresh();
  }, [hash, selected, sessions]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!sessions.data) return;
    if (selected.size === sessions.data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.data.map((s) => s.id)));
    }
  };

  if (project.loading) return <LoadingState />;
  if (project.error)
    return <ErrorState message={project.error} onRetry={project.refresh} />;
  if (!project.data) return <ErrorState message="项目未找到" />;

  const p = project.data;
  const filteredSessions =
    sessions.data?.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.preview?.toLowerCase().includes(q) ||
        s.model?.toLowerCase().includes(q)
      );
    }) ?? [];

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "sessions", label: "会话", icon: <MessageSquare size={16} />, count: sessions.data?.length },
    { key: "claude-md", label: "CLAUDE.md", icon: <FileText size={16} /> },
    { key: "memory", label: "Memory", icon: <Brain size={16} />, count: memory.data?.length },
    { key: "skills", label: "Skills", icon: <Sparkles size={16} />, count: skills.data?.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/projects")}
          className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">
            {projectName(p.projectPath)}
          </h1>
          <p className="text-sm text-gray-500 truncate font-mono mt-1">
            {p.projectPath || p.hash}
          </p>
          <div className="flex gap-2 mt-2">
            {p.hasClaudeMd && <Badge variant="success">CLAUDE.md</Badge>}
            {p.hasMemory && <Badge variant="info">Memory</Badge>}
            {p.hasSkills && <Badge variant="warning">Skills</Badge>}
            <Badge>{p.sessionCount} 会话</Badge>
            {p.lastActive > 0 && (
              <Badge variant="default">最后活跃: {timeAgo(p.lastActive)}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="搜索会话…"
            />
            <div className="flex gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => setBatchDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  删除选中 ({selected.size})
                </button>
              )}
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {selected.size === sessions.data?.length ? (
                  <CheckSquare size={14} />
                ) : (
                  <Square size={14} />
                )}
                {selected.size === sessions.data?.length ? "取消全选" : "全选"}
              </button>
            </div>
          </div>

          {sessions.loading ? (
            <LoadingState />
          ) : filteredSessions.length === 0 ? (
            <EmptyState title="无会话" description="该项目下没有会话记录" />
          ) : (
            <div className="grid gap-2">
              {filteredSessions.map((session) => (
                <Card key={session.id} className="!p-4">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(session.id);
                      }}
                      className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {selected.has(session.id) ? (
                        <CheckSquare size={18} className="text-amber-500" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    {/* Session info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() =>
                        navigate(`/projects/${hash}/sessions/${session.id}`)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {session.preview
                            ? truncate(session.preview, 80)
                            : session.id.slice(0, 8)}
                        </span>
                        {session.model && (
                          <Badge variant="info">{shortModel(session.model)}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatDate(session.createdAt)}</span>
                        <span>{session.messageCount} 条消息</span>
                        <span>{formatBytes(session.fileSize)}</span>
                        <span className="font-mono">{session.id.slice(0, 8)}…</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(session.id);
                      }}
                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除会话"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "claude-md" && (
        <Card>
          {claudeMd.loading ? (
            <LoadingState />
          ) : claudeMd.data ? (
            <div>
              <p className="text-xs text-gray-500 mb-4 font-mono">
                {claudeMd.data.path}
              </p>
              <MarkdownViewer content={claudeMd.data.content} />
            </div>
          ) : (
            <EmptyState
              title="无 CLAUDE.md"
              description="该项目尚未创建 CLAUDE.md 文件"
            />
          )}
        </Card>
      )}

      {tab === "memory" && (
        <div className="space-y-4">
          {memory.loading ? (
            <LoadingState />
          ) : memory.data && memory.data.length > 0 ? (
            memory.data.map((file) => (
              <Card key={file.path}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{file.name}</h3>
                  <span className="text-xs text-gray-500">
                    {timeAgo(file.updatedAt)}
                  </span>
                </div>
                <MarkdownViewer content={file.content} />
              </Card>
            ))
          ) : (
            <EmptyState
              title="无 Memory 文件"
              description="该项目没有自动记忆文件"
            />
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="space-y-4">
          {skills.loading ? (
            <LoadingState />
          ) : skills.data && skills.data.length > 0 ? (
            skills.data.map((skill) => (
              <Card key={skill.path}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{skill.name}</h3>
                    <Badge variant={skill.scope === "user" ? "info" : "success"}>
                      {skill.scope === "user" ? "用户级" : "项目级"}
                    </Badge>
                  </div>
                </div>
                <MarkdownViewer content={skill.content} />
              </Card>
            ))
          ) : (
            <EmptyState
              title="无 Skills"
              description="该项目没有 Skills 文件"
            />
          )}
        </div>
      )}

      {/* Delete confirm dialogs */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除会话"
        message={`确定要删除会话 ${deleteTarget?.slice(0, 8)}… 吗？此操作不可撤销。`}
        confirmLabel="删除"
        danger
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        title="批量删除会话"
        message={`确定要删除选中的 ${selected.size} 个会话吗？此操作不可撤销。`}
        confirmLabel={`删除 ${selected.size} 个会话`}
        danger
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </div>
  );
}
