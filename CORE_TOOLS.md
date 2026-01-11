# OpenCode 核心工具分析

## 项目概述

OpenCode 是一个**开源 AI 编码代理**，提供命令行和终端界面的 AI 辅助开发功能。它设计为提供商无关（支持 Claude、OpenAI、Google 或本地模型），专注于 TUI（终端用户界面）和 LSP（语言服务器协议）支持。

---

## 核心工具架构

工具实现在 `packages/opencode/src/tool/` 目录下，采用统一架构：

- **工具注册** (`tool.ts`): 定义核心 `Tool` 接口，包含元数据、参数验证和执行上下文
- **输出截断**: 自动处理大响应的截断
- **权限系统**: 工具执行前检查权限
- **会话管理**: 在会话中跟踪工具

---

## 核心工具分类

### 1. 文件系统工具

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **Read** | 读取文件，支持图片/PDF、二进制检测、行限制、智能截断 | `tool/read.ts` |
| **Write** | 写入文件，生成 diff、LSP 诊断集成 | `tool/write.ts` |
| **Edit** | 文本替换，基于 diff 的补丁 | `tool/edit.ts` |
| **Glob** | 文件模式匹配，支持路径过滤和限制 | `tool/glob.ts` |
| **LS** | 目录列表功能 | `tool/ls.ts` |

### 2. 搜索工具

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **Grep** | 内容搜索（基于 ripgrep），支持正则表达式和文件过滤 | `tool/grep.ts` |
| **CodeSearch** | 通过 Exa API 进行网络代码搜索，用于查找文档/示例 | `tool/codesearch.ts` |

### 3. 开发工具

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **Bash** | Shell 命令执行，支持超时、语法解析和安全控制 | `tool/bash.ts` |
| **LSP** | 语言服务器协议集成，提供代码智能 | `tool/lsp.ts` |
| **Todo** | 任务跟踪读写功能 | `tool/todo.ts` |

### 4. 网络和集成工具

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **WebSearch** | 网络搜索（使用 Exa API），支持可配置参数 | `tool/websearch.ts` |
| **WebFetch** | 获取 URL 内容，HTML 转 Markdown 转换 | `tool/webfetch.ts` |
| **Batch** | 并行执行多个工具（最多 10 个）以提升性能 | `tool/batch.ts` |

### 5. 代理和任务管理

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **Task** | 委托给专门代理处理复杂工作流 | `tool/task.ts` |
| **Skill** | 加载预定义技能以获得专门指导 | `tool/skill.ts` |
| **Question** | 交互式用户输入提示 | `tool/question.ts` |

### 6. 系统工具

| 工具 | 功能 | 文件位置 |
|------|------|----------|
| **MultiEdit** | 多文件编辑功能 | `tool/multiedit.ts` |
| **Patch** | Git 补丁生成/应用 | `tool/patch.ts` |
| **Registry** | 工具管理和插件集成 | `tool/registry.ts` |

---

## 核心架构模式

### 工具定义模式
```typescript
export const ToolName = Tool.define("tool-id", {
  description: "...",
  parameters: z.object({...}),
  async execute(params, ctx) { ... }
})
```

### 权限系统
- 工具在执行前调用 `ctx.ask()` 请求权限
- 模式定义权限请求的范围
- Always permissions 允许某些操作

### 输出标准化
- 所有工具返回标准化格式：`{title, output, metadata, attachments?}`
- 自动截断并跟踪元数据
- 支持文件附件

### 插件集成
- 通过 `.opencode/tool/` 目录添加自定义工具
- MCP（模型上下文协议）服务器集成
- 用于扩展功能的插件系统

---

## 外部集成

### MCP（模型上下文协议）
- 服务器认证和管理
- 外部服务的 OAuth 提供商
- 工具定义映射

### 预装 MCP 工具
- **GitHub PR Search** (`github-pr-search.ts`): GitHub 搜索 PR
- **GitHub Triage** (`github-triage.ts`): GitHub 问题分类

---

## 代理类型

| 类型 | 描述 |
|------|------|
| **build** | 具有完整访问权限的开发代理 |
| **plan** | 具有只读权限的分析代理 |
| **general** | 用于复杂搜索和多步骤任务的代理 |

---

## 特色功能

### 实验性功能
- 批量工具执行（可切换）
- LSP 工具集成（可切换）
- 可配置的超时和限制

### 安全性
- 路径验证和沙箱
- 权限边界
- 二进制文件检测
- 命令执行限制

---

## 总结

OpenCode 提供了一个全面、可扩展的 AI 辅助编码基础，重点强调：

- **安全性**: 权限系统、沙箱、路径验证
- **性能**: 批量执行、并行处理
- **可扩展性**: 插件系统、MCP 集成
- **用户体验**: 统一接口、标准化输出、交互式权限

---

*生成时间: 2026-01-08*
*项目分支: analysis*
