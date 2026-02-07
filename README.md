# Claude Code Sessions

> 📊 Web 可视化工具，用于浏览和管理本地 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 的项目数据与会话记录。

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## ✨ 功能特性

- **项目总览** — 一览所有使用过 Claude Code 的项目，统计会话数、数据大小等关键指标
- **会话查看器** — 浏览和查看每个项目的完整对话记录（支持 Markdown 渲染与代码高亮）
- **CLAUDE.md 管理** — 在线查看和编辑用户级 / 项目级 CLAUDE.md 文件
- **实时监听** — 通过 Socket.IO 实时监听文件变更，自动刷新数据
- **暗色模式** — 内置亮色 / 暗色主题切换
- **项目记忆与技能** — 查看项目的 memory 文件和 skills 配置

## 🏗️ 技术栈

| 层级 | 技术 |
| --- | --- |
| **Monorepo** | pnpm workspaces |
| **前端** | React 19, React Router 7, Vite 6, Tailwind CSS 4, Lucide Icons |
| **后端** | Express 5, Socket.IO 4, Chokidar, Zod |
| **语言** | TypeScript 5.7 |

## 📁 项目结构

```
claude-code-sessions/
├── packages/
│   ├── server/          # Express API 服务器
│   │   └── src/
│   │       ├── index.ts          # 服务器入口
│   │       ├── config.ts         # 配置 (路径、端口等)
│   │       ├── routes/api.ts     # REST API 路由
│   │       └── services/
│   │           ├── claude-data.ts    # Claude 数据读取服务
│   │           └── file-watcher.ts   # 文件变更监听
│   └── web/             # React 前端应用
│       └── src/
│           ├── App.tsx           # 主应用 (路由 + 导航)
│           ├── api.ts            # API 客户端
│           ├── pages/            # 页面组件
│           │   ├── DashboardPage.tsx
│           │   ├── ProjectsPage.tsx
│           │   ├── ProjectDetailPage.tsx
│           │   ├── SessionViewerPage.tsx
│           │   ├── SettingsPage.tsx
│           │   └── UserClaudeMdPage.tsx
│           └── components/       # 通用组件
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 🚀 快速开始

### 前置要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- 已安装并使用过 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)（本地需存在 `~/.claude/` 目录）

### 安装

```bash
# 克隆项目
git clone https://github.com/timmy21/claude-code-sessions.git
cd claude-code-sessions

# 安装依赖
pnpm install
```

### 启动开发服务器

```bash
# 同时启动前端和后端
pnpm dev

# 或分别启动
pnpm dev:server   # API 服务器 → http://localhost:3581
pnpm dev:web      # 前端应用 → http://localhost:5173
```

打开浏览器访问 **http://localhost:5173** 即可使用。

### 构建生产版本

```bash
pnpm build
```

## ⚙️ 配置

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | API 服务器端口 | `3581` |
| `CORS_ORIGIN` | 允许的前端来源 | `http://localhost:5173` |
| `CLAUDE_CONFIG_DIR` | Claude Code 配置目录 | `~/.claude/` |

## 📡 API 接口

服务器提供以下 REST API：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/projects` | 获取所有项目列表 |
| `GET` | `/api/projects/:hash` | 获取单个项目详情 |
| `GET` | `/api/projects/:hash/sessions` | 获取项目的会话列表 |
| `GET` | `/api/projects/:hash/sessions/:id` | 获取完整会话内容 |
| `GET` | `/api/projects/:hash/claude-md` | 获取项目的 CLAUDE.md |
| `GET` | `/api/projects/:hash/memory` | 获取项目的 memory 文件 |
| `GET` | `/api/projects/:hash/skills` | 获取项目的 skills |
| `GET` | `/api/stats` | 获取全局统计信息 |
| `GET` | `/api/settings` | 获取用户设置 |
| `GET` | `/api/user-claude-md` | 获取用户级 CLAUDE.md |
| `GET` | `/health` | 健康检查 |

## 📄 License

MIT
