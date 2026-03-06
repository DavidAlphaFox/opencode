# Agent 记忆管理

## 1. 记忆存储结构

### 数据库表 (`packages/opencode/src/session/session.sql.ts`)

```
session
  ├── id, project_id, workspace_id, parent_id
  ├── slug, title, directory
  ├── version, share_url
  ├── summary_additions, summary_deletions, summary_files
  ├── summary_diffs (JSON)
  ├── revert (JSON: 恢复点信息)
  ├── permission (JSON: 权限规则)
  └── time_created, time_updated, time_compacting, time_archived

message
  ├── id, session_id (外键, CASCADE删除)
  └── data (JSON: role, agent, model, system等)

part
  ├── id, message_id (外键), session_id
  └── data (JSON: type=text/tool/file等, output, state等)

todo
  ├── session_id (复合主键)
  └── content, status, priority, position
```

### Session 核心操作 (`packages/opencode/src/session/index.ts`)

| 操作 | 函数                                                   | 说明                      |
| ---- | ------------------------------------------------------ | ------------------------- |
| 创建 | `create`, `createNext`                                 | 支持 parentID 分叉        |
| 查询 | `get`, `list`, `listGlobal`, `children`                | 按时间/目录/workspace过滤 |
| 更新 | `setTitle`, `setSummary`, `setPermission`, `setRevert` | 修改session属性           |
| 删除 | `remove`                                               | 递归删除子session         |
| 分叉 | `fork`                                                 | 复制消息创建新session     |

---

## 2. Message 与 Part 表详解

### Message 表 vs Part 表

| 维度     | Message 表                                | Part 表                                 |
| -------- | ----------------------------------------- | --------------------------------------- |
| 粒度     | 消息级别                                  | 消息内的片段级别                        |
| 存储内容 | 消息的元信息 (role, agent, model, time等) | 消息的具体内容 (文本、工具调用、文件等) |
| 关系     | 1个Message                                | 1个Message 对应 N个Part                 |

### Message 消息类型

**User 消息 - 用户输入**

```typescript
{
  role: "user",
  time: { created: number },
  agent: string,          // 使用的agent名称
  model: { providerID, modelID },
  system?: string,        // 系统提示
  tools?: Record<string, boolean>,  // 启用的工具
  variant?: string
}
```

**Assistant 消息 - AI响应**

```typescript
{
  role: "assistant",
  time: { created, completed },
  error?: Error,          // 错误信息
  parentID: string,       // 父消息ID
  modelID, providerID,
  mode?: "compaction" | "command" | "prompt" | "shell",
  summary?: boolean,      // 是否为摘要消息
  finish?: "stop" | "continue" | "error",
  tokens?: {...},
  cost?: number
}
```

### Part 片段类型

| 类型         | 说明           |
| ------------ | -------------- |
| `text`       | 文本输出       |
| `tool`       | 工具调用及结果 |
| `file`       | 文件内容/附件  |
| `reasoning`  | 思考过程       |
| `subtask`    | 子任务结果     |
| `snapshot`   | 文件快照       |
| `patch`      | 补丁           |
| `compaction` | 压缩标记       |
| `retry`      | 重试标记       |

### 存储示例

**用户消息 Example:**

```typescript
// Message 表
{ id: "msg_001", role: "user", agent: "build", ... }

// Part 表 (多个)
[
  { type: "text", text: "帮我写一个函数..." },
  { type: "file", filename: "example.png", mime: "image/png" }
]
```

**助手消息 Example:**

```typescript
// Message 表
{ role: "assistant", parentID: "msg_001", modelID: "...", ... }

// Part 表 (多个)
[
  { type: "reasoning", text: "思考过程..." },
  { type: "text", text: "好的，我来帮你..." },
  { type: "tool", tool: "write", state: { status: "completed", output: "..." } }
]
```

### 存储流程

```
用户输入 → SessionPrompt.prompt()
              ↓
         Session.updateMessage() → message表
              ↓
         工具调用循环
              ↓
         Session.updatePart() → part表
              ↓
         完成 → time_updated 记录完成时间
```

### Part 来源说明

Part 不仅仅来自工具调用，有多种来源：

| 消息角色           | Part 来源                                   |
| ------------------ | ------------------------------------------- |
| **User** (用户)    | 用户输入的文本、用户上传的文件              |
| **Assistant** (AI) | AI 生成的文本、思考过程、工具调用、工具结果 |

**结论**：

- User 消息的 Part → 用户产生
- Assistant 消息的 Part → AI 产生

---

## 3. 指令系统 (Instruction Prompt)

### 指令来源优先级

| 来源   | 文件                             | 查找方式           |
| ------ | -------------------------------- | ------------------ |
| 项目级 | `AGENTS.md`, `CLAUDE.md`         | 从当前目录向上查找 |
| 用户级 | `~/.claude/CLAUDE.md`            | 用户主目录         |
| 全局级 | `$OPENCODE_CONFIG_DIR/AGENTS.md` | 环境变量指定       |
| 配置级 | `config.instructions`            | 配置文件指定       |

### 核心文件

- **指令解析**: `packages/opencode/src/session/instruction.ts`
- **System Prompt**: `packages/opencode/src/session/system.ts`
- **Agent定义**: `packages/opencode/src/agent/agent.ts`

### System Prompt 组成 (`session/llm.ts`)

```typescript
const system = [
  // 1. Agent自定义 prompt 或 Provider默认提示
  ...(input.agent.prompt ? [input.agent.prompt] : SystemPrompt.provider(model)),
  // 2. 输入的 system 参数
  ...input.system,
  // 3. 用户消息的 system 字段
  ...(input.user.system ? [input.user.system] : []),
]
  .filter((x) => x)
  .join("\n")
```

---

## 3. Agent 类型定义

### 内置 Agent (`agent/agent.ts`)

| Agent        | Mode     | 用途          | 权限特点                |
| ------------ | -------- | ------------- | ----------------------- |
| `build`      | primary  | 默认执行agent | 基础权限 + 用户配置     |
| `plan`       | primary  | 计划模式      | 禁止edit, 允许plan_exit |
| `general`    | subagent | 通用研究      | 禁止todoread/write      |
| `explore`    | subagent | 代码探索      | 仅允许只读工具          |
| `compaction` | primary  | 记忆压缩      | 禁止所有工具            |
| `title`      | primary  | 生成标题      | 禁止所有工具            |
| `summary`    | primary  | 生成摘要      | 禁止所有工具            |

### Agent 配置结构

```typescript
{
  name: string,
  description?: string,
  mode: "subagent" | "primary" | "all",
  native?: boolean,
  hidden?: boolean,
  topP?: number,
  temperature?: number,
  color?: string,
  permission: PermissionNext.Ruleset,
  model?: { modelID: string, providerID: string },
  variant?: string,
  prompt?: string,
  options?: Record<string, any>,
  steps?: number,
}
```

---

## 4. 记忆压缩机制

### 触发条件

当对话 tokens 超过模型 context 限制时触发 (`session/compaction.ts`):

```typescript
const usable = model.limit.input - reserved // reserved 默认 20K
return count >= usable
```

### 压缩策略

#### Prune (裁剪)

- 保留最近 **40K tokens** 的 tool 输出
- 超过部分标记 `time.compacted = Date.now()`
- 内容替换为 `"[Old tool result content cleared]"`
- **保留** `skill` 工具输出（不裁剪）

#### Process (压缩)

1. 创建 summary 消息（使用 compaction agent）
2. 提取关键信息模板：
   - **Goal**: 用户目标
   - **Instructions**: 重要指令
   - **Discoveries**: 发现的关键信息
   - **Accomplished**: 完成的工作
   - **Relevant files**: 相关文件列表
3. 重播用户消息继续对话

### 错误处理

- `ContextOverflowError`: 超过模型限制
- 压缩后仍超限: 提示用户减少附件

---

## 5. 消息构建流程

### toModelMessages (`session/message-v2.ts`)

将 session 消息转换为 LLM 格式:

1. **User 消息**: 合并 text/file/compaction/subtask parts
2. **Assistant 消息**: 合并 text/tool/reasoning parts
3. **裁剪处理**: 已压缩的 tool 输出显示为占位符
4. **媒体处理**: 根据模型支持情况处理图片/附件

### 消息状态流

```
用户输入 → SessionPrompt.prompt()
           ↓
        LLM.stream() ← system + messages
           ↓
        SessionProcessor.process()
           ↓
        工具调用 → 工具执行 → 结果存储
           ↓
        Session.updatePart() → PartTable
           ↓
        循环直到完成
```

---

## 6. 相关文件索引

| 功能          | 文件路径                       |
| ------------- | ------------------------------ |
| Session定义   | `src/session/index.ts`         |
| Session数据库 | `src/session/session.sql.ts`   |
| 消息处理      | `src/session/message-v2.ts`    |
| LLM调用       | `src/session/llm.ts`           |
| Agent定义     | `src/agent/agent.ts`           |
| 指令解析      | `src/session/instruction.ts`   |
| System Prompt | `src/session/system.ts`        |
| 记忆压缩      | `src/session/compaction.ts`    |
| API路由       | `src/server/routes/session.ts` |
