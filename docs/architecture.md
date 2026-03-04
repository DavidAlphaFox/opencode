# OpenCode 架构分析

## 1. 整体架构

```
packages/
├── opencode/          # 核心后端服务
│   └── src/
│       ├── agent/     # Agent 定义和配置
│       ├── tool/      # 工具实现 (包括 task tool)
│       ├── session/   # 会话处理 (prompt.ts 是核心)
│       ├── config/    # 配置管理
│       └── ...
├── app/               # 前端应用 (SolidJS)
└── desktop/           # 桌面客户端
```

## 2. Agent 系统

**Agent 类型定义** (`packages/opencode/src/agent/agent.ts`):

```typescript
mode: z.enum(["subagent", "primary", "all"])
```

**内置 Agent**:

| Agent     | Mode     | 用途            |
| --------- | -------- | --------------- |
| `build`   | primary  | 默认执行 agent  |
| `plan`    | primary  | 计划模式 (只读) |
| `general` | subagent | 通用研究 agent  |
| `explore` | subagent | 代码探索 agent  |

## 3. 主Agent与SubAgent通讯机制

**核心文件**: `packages/opencode/src/tool/task.ts`

```
主Agent 调用 task tool
         ↓
   TaskTool.execute()
         ↓
  创建子会话 (Session.create)
         ↓
  使用 SessionPrompt.prompt() 执行子任务
         ↓
  返回结果 (包含 task_id)
```

**关键流程** (task.ts:66-102):

1. 创建子会话，继承父会话的 `parentID`
2. 设置子会话权限 (默认禁止 `todowrite`, `todoread`)
3. 使用父会话的 model 或子 agent 指定的 model
4. 返回 `task_id` 供后续恢复

## 4. 任务拆分方式

**调用方式** (prompt.ts:126-143):

```typescript
const result = await SessionPrompt.prompt({
  messageID,
  sessionID: session.id, // 子会话 ID
  model: { modelID, providerID },
  agent: agent.name, // subagent 名称
  parts: promptParts,
})
```

**两种触发方式**:

1. **@ 提及**: 用户在消息中 `@explore` 触发
2. **Task Tool**: 主 agent 显式调用 task tool

## 5. 消息与上下文传递

**Session 数据流**:

- 父会话消息通过 `MessageV2` 传递给子会话
- 子会话结果通过 tool output 返回给父会话
- 使用 `SubtaskPart` / `AgentPart` 表示子任务

**权限继承** (task.ts:76-101):

- 子会话权限 = 默认权限 + 主 agent 权限
- 可通过 `hasTaskPermission` 控制递归调用

## 6. 会话管理

**Session 创建** (`session/session.sql.ts`):

- 每个 session 有唯一 ID (`session_xxx`)
- 父子会话通过 `parentID` 关联
- 支持会话恢复 (`task_id` 参数)

**Session Loop** (`session/prompt.ts:274-726`):

```typescript
while (true) {
  // 1. 检查是否有 pending subtask
  // 2. 检查是否需要 compaction
  // 3. 处理正常消息
  // 4. 调用 LLM 获取响应
  // 5. 执行 tool calls
}
```

## 7. 核心代码路径

| 功能         | 文件路径                                      |
| ------------ | --------------------------------------------- |
| Agent 定义   | `packages/opencode/src/agent/agent.ts`        |
| Task Tool    | `packages/opencode/src/tool/task.ts`          |
| Session 处理 | `packages/opencode/src/session/prompt.ts`     |
| 消息结构     | `packages/opencode/src/session/message-v2.ts` |
| 工具注册     | `packages/opencode/src/tool/registry.ts`      |
| 权限系统     | `packages/opencode/src/permission/next.ts`    |

## 8. 总结

| 机制           | 实现                              |
| -------------- | --------------------------------- |
| **通讯协议**   | Tool calls (TaskTool)             |
| **消息格式**   | Session/MessageV2 结构化消息      |
| **任务拆分**   | SessionPrompt.prompt() 创建子会话 |
| **上下文传递** | 消息流 + parentID 关联            |
| **权限控制**   | PermissionNext ruleset 继承       |

## 9. Editor 工具

**核心文件**: `packages/opencode/src/tool/edit.ts`

### Tool 描述 (edit.txt)

```
Performs exact string replacements in files.

Usage:
- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: line number + colon + space (e.g., `1: `). Everything after that space is the actual file content to match. Never include any part of the line number prefix in the oldString or newString.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if `oldString` is not found in the file with an error "oldString not found in content".
- The edit will FAIL if `oldString` is found multiple times in the file with an error "Found multiple matches for oldString. Provide more surrounding lines in oldString to identify the correct match." Either provide a larger string with more surrounding context to make it unique or use `replaceAll` to change every instance of `oldString`.
- Use `replaceAll` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
```

### Input Schema

```typescript
z.object({
  filePath: z.string().describe("The absolute path to the file to modify"),
  oldString: z.string().describe("The text to replace"),
  newString: z.string().describe("The text to replace it with (must be different from oldString)"),
  replaceAll: z.boolean().optional().describe("Replace all occurrences of oldString (default false)"),
})
```

### 关键特性

1. **精确字符串匹配** - 基于字符串替换，不是行号
2. **多种回退策略** - 当精确匹配失败时，尝试：
   - `SimpleReplacer` - 精确匹配
   - `LineTrimmedReplacer` - 忽略行首尾空格
   - `BlockAnchorReplacer` - 首尾锚点匹配
   - `WhitespaceNormalizedReplacer` - 空白符归一化
   - `IndentationFlexibleReplacer` - 缩进灵活匹配
   - `EscapeNormalizedReplacer` - 转义字符处理
   - `TrimmedBoundaryReplacer` - 边界裁剪匹配
   - `ContextAwareReplacer` - 上下文感知匹配
3. **权限检查** - 调用前需要 `edit` 权限

## 10. Claude Code Editor 方式

Claude Code 的 Edit 工具与 OpenCode 类似，使用的是 **replace** (字符串替换) 方式，不是 hashline 方式。

### Input Schema

```typescript
{
  file_path: string,      // 文件路径
  old_string: string,    // 要替换的文本
  new_string: string,    // 替换后的文本
  replace_all?: boolean   // 是否全部替换
}
```

### 关键特性

| 特性       | OpenCode               | Claude Code    |
| ---------- | ---------------------- | -------------- |
| 方式       | replace                | replace        |
| 精确匹配   | 多种 fallback replacer | 字符串匹配     |
| 多匹配处理 | 抛出错误要求更多上下文 | 需要更多上下文 |

### 相同点

- 同样基于 `old_string` / `new_string` 字符串替换
- 不支持 hashline (行号) 方式
- 需要先读取文件才能编辑

### 参考

- [Claude Code Tools](https://docs.anthropic.com/en/docs/claude-code/tools) (需要登录查看)
