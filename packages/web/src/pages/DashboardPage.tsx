import {
  FolderOpen,
  MessageSquare,
  FileText,
  HardDrive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAsync } from "../hooks";
import { fetchProjects, fetchStats } from "../api";
import { LoadingState, ErrorState, StatCard, Card, Badge } from "../components/ui";
import { projectName, timeAgo, formatBytes } from "../utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const stats = useAsync(() => fetchStats());
  const projects = useAsync(() => fetchProjects());

  if (stats.loading || projects.loading) return <LoadingState />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.refresh} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">总览</h1>
        <p className="text-gray-500 mt-1">Claude Code 使用情况概览</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="项目数"
          value={stats.data?.totalProjects ?? 0}
          icon={<FolderOpen size={24} />}
        />
        <StatCard
          label="会话数"
          value={stats.data?.totalSessions ?? 0}
          icon={<MessageSquare size={24} />}
        />
        <StatCard
          label="有 CLAUDE.md"
          value={stats.data?.projectsWithClaudeMd ?? 0}
          icon={<FileText size={24} />}
        />
        <StatCard
          label="数据大小"
          value={formatBytes(stats.data?.totalSizeBytes ?? 0)}
          icon={<HardDrive size={24} />}
        />
      </div>

      {/* Recent projects */}
      <div>
        <h2 className="text-lg font-semibold mb-4">最近活跃的项目</h2>
        {projects.data && projects.data.length > 0 ? (
          <div className="grid gap-3">
            {projects.data.slice(0, 10).map((project) => (
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
                      <p className="text-sm text-gray-500 truncate">
                        {project.projectPath || project.hash}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="flex gap-1.5">
                      {project.hasClaudeMd && (
                        <Badge variant="success">CLAUDE.md</Badge>
                      )}
                      {project.hasMemory && (
                        <Badge variant="info">Memory</Badge>
                      )}
                      {project.hasSkills && (
                        <Badge variant="warning">Skills</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {project.sessionCount} 会话
                      </p>
                      <p className="text-xs text-gray-500">
                        {timeAgo(project.lastActive)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-10 text-gray-500">
            <p>未发现 Claude Code 项目</p>
            <p className="text-sm mt-1">
              请确保 ~/.claude/projects/ 目录存在
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
