import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Bot,
  Wrench,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Brain,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAsync } from "../hooks";
import { fetchSession } from "../api";
import { LoadingState, ErrorState, Badge } from "../components/ui";
import { formatDate, formatBytes, shortModel, getMessageText } from "../utils";
import type { SessionMessage, ContentBlock } from "../types";

export default function SessionViewerPage() {
  const { hash, sessionId } = useParams<{ hash: string; sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, loading, error, refresh } = useAsync(
    () => fetchSession(hash!, sessionId!),
    [hash, sessionId],
  );

  if (loading) return <LoadingState message="加载会话内容…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!session) return <ErrorState message="会话未找到" />;

  // Calculate total cost and tokens
  const totalCost = session.messages.reduce((sum, m) => sum + (m.costUsd ?? 0), 0);
  const totalInputTokens = session.messages.reduce(
    (sum, m) => sum + (m.usage?.input_tokens ?? 0),
    0,
  );
  const totalOutputTokens = session.messages.reduce(
    (sum, m) => sum + (m.usage?.output_tokens ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(`/projects/${hash}`)}
          className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate">
            {session.preview || session.id.slice(0, 12)}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="font-mono">{session.id}</span>
            <span>·</span>
            <span>{formatDate(session.createdAt)}</span>
            <span>·</span>
            <span>{session.messageCount} 条消息</span>
            <span>·</span>
            <span>{formatBytes(session.fileSize)}</span>
            {session.model && (
              <>
                <span>·</span>
                <Badge variant="info">{shortModel(session.model)}</Badge>
              </>
            )}
          </div>
          {(totalCost > 0 || totalInputTokens > 0) && (
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {totalCost > 0 && <span>💰 ${totalCost.toFixed(4)}</span>}
              {totalInputTokens > 0 && (
                <span>📥 {totalInputTokens.toLocaleString()} tokens</span>
              )}
              {totalOutputTokens > 0 && (
                <span>📤 {totalOutputTokens.toLocaleString()} tokens</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {session.messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} index={idx} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Message bubble component
// ============================================================

function MessageBubble({
  message,
  index,
}: {
  message: SessionMessage;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool" || message.toolName;
  const hasThinking = !!message.thinking;

  // Extract text content
  const text = getMessageText(message.content);
  const toolBlocks = extractToolBlocks(message.content);

  // Skip empty system messages
  if (message.role === "system" && !text) return null;

  return (
    <div
      className={`flex gap-3 ${isUser ? "" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : isTool
              ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        }`}
      >
        {isUser ? (
          <User size={16} />
        ) : isTool ? (
          <Wrench size={16} />
        ) : (
          <Bot size={16} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Role label */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase">
            {isUser ? "用户" : isTool ? message.toolName || "工具" : "Claude"}
          </span>
          {message.model && (
            <Badge variant="info">{shortModel(message.model)}</Badge>
          )}
          {message.durationMs && (
            <span className="text-xs text-gray-400">
              {(message.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          {message.costUsd && (
            <span className="text-xs text-gray-400">
              ${message.costUsd.toFixed(4)}
            </span>
          )}
          <span className="text-xs text-gray-400">#{index + 1}</span>
        </div>

        {/* Thinking block */}
        {hasThinking && <ThinkingBlock thinking={message.thinking!} />}

        {/* Text content */}
        {text && (
          <div
            className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap break-words ${
              isUser
                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40"
                : "bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            }`}
          >
            <MessageContent text={text} />
          </div>
        )}

        {/* Tool use blocks */}
        {toolBlocks.map((block, i) => (
          <ToolUseBlock key={i} block={block} />
        ))}

        {/* Tool result */}
        {message.toolResult !== undefined && (
          <CollapsibleBlock
            title="工具结果"
            defaultExpanded={false}
            variant="result"
          >
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {typeof message.toolResult === "string"
                ? message.toolResult
                : JSON.stringify(message.toolResult, null, 2)}
            </pre>
          </CollapsibleBlock>
        )}

        {/* Tool input (legacy format) */}
        {message.toolInput && !toolBlocks.length && (
          <CollapsibleBlock
            title={`🔧 ${message.toolName || "Tool"}`}
            defaultExpanded={false}
            variant="tool"
          >
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(message.toolInput, null, 2)}
            </pre>
          </CollapsibleBlock>
        )}

        {/* Usage stats */}
        {message.usage && (message.usage.input_tokens || message.usage.output_tokens) && (
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            {message.usage.input_tokens && (
              <span>输入: {message.usage.input_tokens.toLocaleString()}</span>
            )}
            {message.usage.output_tokens && (
              <span>输出: {message.usage.output_tokens.toLocaleString()}</span>
            )}
            {message.usage.cache_read_input_tokens && (
              <span>
                缓存: {message.usage.cache_read_input_tokens.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-600 transition-colors"
      >
        <Brain size={14} />
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        思考过程
      </button>
      {expanded && (
        <div className="mt-1 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 text-xs text-purple-800 dark:text-purple-300 whitespace-pre-wrap">
          {thinking}
        </div>
      )}
    </div>
  );
}

function MessageContent({ text }: { text: string }) {
  // Simple code block detection and rendering
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          const [, lang, code] = codeMatch;
          return (
            <div key={i} className="my-2">
              <CodeBlock code={code.trim()} language={lang || "text"} />
            </div>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-700/50 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
        title="复制代码"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function ToolUseBlock({ block }: { block: ContentBlock }) {
  return (
    <CollapsibleBlock
      title={`🔧 ${block.name || "Tool Use"}`}
      defaultExpanded={false}
      variant="tool"
    >
      {block.input && (
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(block.input, null, 2)}
        </pre>
      )}
    </CollapsibleBlock>
  );
}

function CollapsibleBlock({
  title,
  children,
  defaultExpanded = false,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "default" | "tool" | "result";
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const borderColor = {
    default: "border-gray-200 dark:border-gray-700",
    tool: "border-purple-200 dark:border-purple-800/50",
    result: "border-green-200 dark:border-green-800/50",
  }[variant];

  return (
    <div className={`mt-2 rounded-lg border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 max-h-96 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function extractToolBlocks(
  content: string | ContentBlock[] | undefined,
): ContentBlock[] {
  if (!content || typeof content === "string") return [];
  if (!Array.isArray(content)) return [];
  return content.filter((b) => b.type === "tool_use");
}
