import { useAsync } from "../hooks";
import { fetchUserClaudeMd } from "../api";
import { LoadingState, ErrorState, Card, EmptyState } from "../components/ui";
import MarkdownViewer from "../components/MarkdownViewer";

export default function UserClaudeMdPage() {
  const { data: content, loading, error, refresh } = useAsync(() => fetchUserClaudeMd());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户 CLAUDE.md</h1>
        <p className="text-gray-500 mt-1">
          全局 CLAUDE.md 文件 (~/.claude/CLAUDE.md)，适用于所有项目
        </p>
      </div>

      <Card>
        {content ? (
          <MarkdownViewer content={content} />
        ) : (
          <EmptyState
            title="无用户级 CLAUDE.md"
            description="~/.claude/CLAUDE.md 文件不存在"
          />
        )}
      </Card>
    </div>
  );
}
