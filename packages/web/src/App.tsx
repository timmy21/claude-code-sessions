import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  FolderOpen,
  LayoutDashboard,
  Moon,
  Sun,
  Settings,
  FileText,
} from "lucide-react";
import { useDarkMode } from "./hooks";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import SessionViewerPage from "./pages/SessionViewerPage";
import SettingsPage from "./pages/SettingsPage";
import UserClaudeMdPage from "./pages/UserClaudeMdPage";

export default function App() {
  const { dark, toggle } = useDarkMode();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
              CC
            </div>
            <span className="font-semibold text-lg hidden sm:inline">
              Claude Code Sessions
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="总览" />
            <NavItem to="/projects" icon={<FolderOpen size={18} />} label="项目" />
            <NavItem to="/user-claude-md" icon={<FileText size={18} />} label="CLAUDE.md" />
            <NavItem to="/settings" icon={<Settings size={18} />} label="设置" />

            <button
              onClick={toggle}
              className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? "浅色模式" : "深色模式"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:hash" element={<ProjectDetailPage />} />
          <Route path="/projects/:hash/sessions/:sessionId" element={<SessionViewerPage />} />
          <Route path="/user-claude-md" element={<UserClaudeMdPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-3 text-center text-sm text-gray-500">
        Claude Code Session Manager · 本地数据只读 · 数据存储于 ~/.claude/
      </footer>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        }`
      }
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}
