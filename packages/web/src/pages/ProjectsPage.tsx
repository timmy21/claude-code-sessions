import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, SortAsc, SortDesc } from "lucide-react";
import { useAsync } from "../hooks";
import { fetchProjects } from "../api";
import { LoadingState, ErrorState, Card, Badge, SearchInput } from "../components/ui";
import { projectName, timeAgo } from "../utils";

type SortKey = "lastActive" | "sessionCount" | "name";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, loading, error, refresh } = useAsync(() => fetchProjects());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!projects) return [];

    let list = projects.filter((p) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        (p.projectPath?.toLowerCase().includes(q) ?? false) ||
        p.hash.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "lastActive":
          cmp = a.lastActive - b.lastActive;
          break;
        case "sessionCount":
          cmp = a.sessionCount - b.sessionCount;
          break;
        case "name":
          cmp = projectName(a.projectPath).localeCompare(
            projectName(b.projectPath),
          );
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [projects, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">所有项目</h1>
          <p className="text-gray-500 mt-1">
            共 {projects?.length ?? 0} 个使用过 Claude Code 的项目
          </p>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="搜索项目名或路径…"
        />
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 text-sm">
        <span className="text-gray-500 py-1">排序：</span>
        {(
          [
            ["lastActive", "最近活跃"],
            ["sessionCount", "会话数"],
            ["name", "名称"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              sortKey === key
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {label}
            {sortKey === key &&
              (sortAsc ? <SortAsc size={14} /> : <SortDesc size={14} />)}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div className="grid gap-3">
        {filtered.map((project) => (
          <Card
            key={project.hash}
            hoverable
            onClick={() => navigate(`/projects/${project.hash}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <FolderOpen size={20} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate">
                    {projectName(project.projectPath)}
                  </h3>
                  <p className="text-sm text-gray-500 truncate font-mono">
                    {project.projectPath || project.hash}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {project.hasClaudeMd && (
                    <Badge variant="success">CLAUDE.md</Badge>
                  )}
                  {project.hasMemory && <Badge variant="info">Memory</Badge>}
                  {project.hasSkills && (
                    <Badge variant="warning">Skills</Badge>
                  )}
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-medium">
                    {project.sessionCount} 会话
                  </p>
                  <p className="text-xs text-gray-500">
                    {project.lastActive ? timeAgo(project.lastActive) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {search ? "没有匹配的项目" : "未发现任何项目"}
        </div>
      )}
    </div>
  );
}
