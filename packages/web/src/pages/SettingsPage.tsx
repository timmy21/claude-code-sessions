import { useAsync } from "../hooks";
import { fetchSettings } from "../api";
import { LoadingState, ErrorState, Card } from "../components/ui";

export default function SettingsPage() {
  const { data: settings, loading, error, refresh } = useAsync(() => fetchSettings());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-gray-500 mt-1">Claude Code 用户设置 (~/.claude/settings.json)</p>
      </div>

      <Card>
        {settings ? (
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-all font-mono text-gray-700 dark:text-gray-300">
            {JSON.stringify(settings, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">未找到设置文件</p>
        )}
      </Card>
    </div>
  );
}
