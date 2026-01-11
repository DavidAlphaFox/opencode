# OpenCode 核心工具分析

OpenCode 是一个开源 AI 编码代理，核心工具定义在 `packages/opencode/src/tool/` 目录下。共有 **23 个核心工具**。

## 一、文件系统工具

| 工具 | 文件 | 功能 |
|------|------|------|
| **Read** | `read.ts` | 读取文件内容，支持图片/PDF预览，行偏移和限制 |
| **Write** | `write.ts` | 创建或覆盖文件，生成 diff 展示 |
| **Edit** | `edit.ts` | 精确字符串替换，支持全局替换 |
| **MultiEdit** | `multiedit.ts` | 单文件内多次编辑，原子操作 |
| **Glob** | `glob.ts` | 文件模式匹配（如 `**/*.js`），按修改时间排序 |
| **List** | `ls.ts` | 目录结构列表，内置忽略模式 |

## 二、搜索工具

| 工具 | 文件 | 功能 |
|------|------|------|
| **Grep** | `grep.ts` | 基于 ripgrep 的正则内容搜索 |
| **WebSearch** | `websearch.ts` | Exa AI 网络搜索，支持实时爬虫 |
| **CodeSearch** | `codesearch.ts` | 代码示例和 API 文档搜索 |

## 三、开发工具

| 工具 | 文件 | 功能 |
|------|------|------|
| **Bash** | `bash.ts` | Shell 命令执行，语法解析，超时控制 |
| **LSP** | `lsp.ts` | 语言服务器协议集成（实验性）：跳转定义、查找引用、悬停信息等 |
| **TodoWrite/TodoRead** | `todo.ts` | 任务管理和跟踪 |

## 四、网络工具

| 工具 | 文件 | 功能 |
|------|------|------|
| **WebFetch** | `webfetch.ts` | 获取 URL 内容，HTML 转 Markdown |
| **Batch** | `batch.ts` | 并行执行多个工具（最多10个），实验性 |

## 五、代理和任务工具

| 工具 | 文件 | 功能 |
|------|------|------|
| **Task** | `task.ts` | 启动专门代理处理复杂任务（plan/build/general） |
| **Skill** | `skill.ts` | 加载预定义技能文档，提供分步指导 |
| **Question** | `question.ts` | 向用户提问（单选/多选），仅 CLI 可用 |
| **Patch** | `patch.ts` | 应用多文件补丁 |
| **Invalid** | `invalid.ts` | 参数验证失败的回退工具 |

## 六、核心架构

### 工具定义接口 (`tool.ts`)

```typescript
export namespace Tool {
  export type Context<M extends Metadata = Metadata> = {
    sessionID: string
    messageID: string
    agent: string
    abort: AbortSignal
    callID?: string
    extra?: { [key: string]: any }
    metadata(input: { title?: string; metadata?: M }): void
    ask(input: PermissionNext.Request): Promise<void>
  }

  export function define<Parameters extends z.ZodType, Result extends Metadata>(
    id: string,
    init: Info<Parameters, Result>["init"]
  ): Info<Parameters, Result>
}
```

### 工具注册流程 (`registry.ts`)

1. **核心工具注册** (硬编码)
   ```typescript
   const tools = [
     InvalidTool, QuestionTool, BashTool, ReadTool, GlobTool,
     GrepTool, EditTool, WriteTool, TaskTool, WebFetchTool,
     TodoWriteTool, TodoReadTool, WebSearchTool, CodeSearchTool, SkillTool,
     LspTool (experimental), BatchTool (experimental)
   ]
   ```

2. **自定义工具加载** (从 `.opencode/tool/` 目录)
3. **插件工具集成** (MCP 服务器)

### 权限类型

- `read`: 文件读取
- `edit`: 文件编辑/写入
- `glob`: 文件模式搜索
- `grep`: 内容搜索
- `list`: 目录列表
- `bash`: 命令执行
- `websearch`: 网络搜索
- `webfetch`: 网页获取
- `codesearch`: 代码搜索
- `lsp`: LSP 操作
- `task`: 代理委托
- `skill`: 技能加载
- `todowrite`/`todoread`: 待办管理
- `external_directory`: 外部目录访问

### 输出截断机制 (`truncation.ts`)

- 默认限制：2000行或50KB
- 超出部分写入临时文件
- 7天自动清理

## 七、目录结构

```
packages/opencode/src/tool/
├── tool.ts                 # 核心定义接口
├── registry.ts             # 工具注册和加载
├── truncation.ts           # 输出截断
├── external-directory.ts   # 外部目录检查
├── read.ts                 # 读取工具
├── write.ts                # 写入工具
├── edit.ts                 # 编辑工具
├── multiedit.ts            # 多编辑工具
├── glob.ts                 # Glob 搜索
├── grep.ts                 # 内容搜索
├── ls.ts                   # 列表工具
├── bash.ts                 # 命令执行
├── websearch.ts            # 网络搜索
├── webfetch.ts             # 网页获取
├── codesearch.ts           # 代码搜索
├── lsp.ts                  # LSP 集成
├── batch.ts                # 批量执行
├── task.ts                 # 代理委托
├── skill.ts                # 技能加载
├── question.ts             # 用户提问
├── patch.ts                # 补丁应用
├── todo.ts                 # 待办管理
├── invalid.ts              # 错误处理
└── *.txt                   # 工具描述文档
```

---

# Task 工具核心提示词

## 提示词来源

文件位置: `packages/opencode/src/tool/task.txt`

## 完整提示词内容

```
Launch a new agent to handle complex, multistep tasks autonomously.

Available agent types and the tools they have access to:
{agents}

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

When to use the Task tool:
- When you are instructed to execute custom slash commands. Use the Task tool with the slash command invocation as the entire prompt. The slash command can take arguments. For example: Task(description="Check the file", prompt="/check-file path/to/file.py")

When NOT to use the Task tool:
- If you want to read a specific file path, use the Read or Glob tool instead of the Task tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the Glob tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Task tool, to find the match more quickly
- Other tasks that are not related to the agent descriptions above


Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless unless you provide a session_id. Your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent's outputs should generally be trusted
5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.

Example usage (NOTE: The agents below are fictional examples for illustration only - use the actual agents listed above):

<example_agent_descriptions>
"code-reviewer": use this agent after you are done writing a significant piece of code
"greeting-responder": use this agent when to respond to user greetings with a friendly joke
</example_agent_description>

<example>
user: "Please write a function that checks if a number is prime"
assistant: Sure let me write a function that checks if a number is prime
assistant: First let me use the Write tool to write a function that checks if a number is prime
assistant: I'm going to use the Write tool to write the following code:
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
Since a significant piece of code was written and the task was completed, now use the code-reviewer agent to review the code
</commentary>
assistant: Now let me use the code-reviewer agent to review the code
assistant: Uses the Task tool to launch the code-reviewer agent
</example>

<example>
user: "Hello"
<commentary>
Since the user is greeting, use the greeting-responder agent to respond with a friendly joke
</commentary>
assistant: "I'm going to use the Task tool to launch the with the greeting-responder agent"
</example>
```

## Task 工具参数

```typescript
const parameters = z.object({
  description: z.string().describe("A short (3-5 words) description of the task"),
  prompt: z.string().describe("The task for the agent to perform"),
  subagent_type: z.string().describe("The type of specialized agent to use for this task"),
  session_id: z.string().describe("Existing Task session to continue").optional(),
  command: z.string().describe("The command that triggered this task").optional(),
})
```

## Task 工具核心特性

1. **权限隔离**: 子会话默认禁用 `todowrite`, `todoread`, `task` 工具
2. **会话继承**: 可通过 `session_id` 继续现有会话
3. **代理过滤**: 根据调用者权限过滤可用代理
4. **元数据追踪**: 实时更新工具执行状态
5. **中止支持**: 监听中止信号取消子会话

---

# TodoWrite/TodoRead 工具分析

## 提示词来源

- TodoWrite: `packages/opencode/src/tool/todowrite.txt`
- TodoRead: `packages/opencode/src/tool/todoread.txt`
- 数据模型: `packages/opencode/src/session/todo.ts`

## 数据结构

```typescript
export const Info = z.object({
  content: z.string().describe("Brief description of the task"),
  status: z.string().describe("Current status: pending, in_progress, completed, cancelled"),
  priority: z.string().describe("Priority level: high, medium, low"),
  id: z.string().describe("Unique identifier for the todo item"),
})
```

**存储方式**: `Storage.write(["todo", sessionID], todos)` - 按会话 ID 隔离存储

**事件系统**: 更新时发布 `todo.updated` 事件，支持 UI 实时响应

## TodoWrite 工具参数

```typescript
parameters: z.object({
  todos: z.array(z.object(Todo.Info.shape)).describe("The updated todo list"),
})
```

## TodoRead 工具参数

无参数，留空即可。

## TodoWrite 完整提示词

```
Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multistep tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos. Feel free to edit the todo list based on new information.
6. After completing a task - Mark it complete and add any new follow-up tasks
7. When you start working on a new task, mark the todo as in_progress. Ideally you should only have one todo as in_progress at a time. Complete existing tasks before starting new ones.

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Examples of When to Use the Todo List

<example>
User: I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you're done!
Assistant: I'll help add a dark mode toggle to your application settings. Let me create a todo list to track this implementation.
*Creates todo list with the following items:*
1. Create dark mode toggle component in Settings page
2. Add dark mode state management (context/store)
3. Implement CSS-in-JS styles for dark theme
4. Update existing components to support theme switching
5. Run tests and build process, addressing any failures or errors that occur
*Begins working on the first task*

<reasoning>
The assistant used the todo list because:
1. Adding dark mode is a multi-step feature requiring UI, state management, and styling changes
2. The user explicitly requested tests and build be run afterward
3. The assistant inferred that tests and build need to pass by adding "Ensure tests and build succeed" as the final task
</reasoning>
</example>

<example>
User: Help me rename the function getCwd to getCurrentWorkingDirectory across my project
Assistant: Let me first search through your codebase to find all occurrences of 'getCwd'.
*Uses grep or search tools to locate all instances of getCwd in the codebase*
Assistant: I've found 15 instances of 'getCwd' across 8 different files. Let me create a todo list to track these changes.
*Creates todo list with specific items for each file that needs updating*

<reasoning>
The assistant used the todo list because:
1. First, the assistant searched to understand the scope of the task
2. Upon finding multiple occurrences across different files, it determined this was a complex task with multiple steps
3. The todo list helps ensure every instance is tracked and updated systematically
4. This approach prevents missing any occurrences and maintains code consistency
</reasoning>
</example>


<example>
User: I need to implement these features for my e-commerce site: user registration, product catalog, shopping cart, and checkout flow.
Assistant: I'll help implement these features. First, let's add all the features to the todo list.
*Creates a todo list breaking down each feature into specific tasks based on the project architecture*
Assistant: Let's start with user registration. This will involve creating database models, API endpoints, and frontend forms that integrate with your existing authentication system.

<reasoning>
The assistant used the todo list because:
1. The user provided multiple complex features to implement in a comma separated list
2. The todo list helps organize these large features into manageable tasks
3. This approach allows for tracking progress across the entire implementation
</reasoning>
</example>

<example>
User: Can you help optimize my React application? It's rendering slowly and has performance issues.</user>
Assistant: I'll help optimize your React application. First, let me examine your codebase to identify potential performance bottlenecks.
*Reviews component structure, render patterns, state management, and data fetching*
Assistant: After analyzing your codebase, I've identified several performance issues. Let me create a todo list to track our optimization efforts.
*Creates todo list with items like: 1) Implement memoization for expensive calculations in ProductList, 2) Add virtualization for long lists in Dashboard, 3) Optimize image loading in Gallery component, 4) Fix state update loops in ShoppingCart, 5) Review bundle size and implement code splitting*
Let's start by implementing memoization for the expensive calculations in your ProductList component.</assistant>

<reasoning>
The assistant used the todo list because:
1. First, the assistant examined the codebase to identify specific performance issues
2. Based on this analysis, it identified multiple optimization opportunities
3. Performance optimization is a non-trivial task requiring multiple steps
4. The todo list helps methodically track improvements across different components
5. This systematic approach ensures all performance bottlenecks are addressed
</reasoning>
</example>

## Examples of When NOT to Use the Todo List

<example>
User: How do I print 'Hello World' in Python?
Assistant: In Python, you can print "Hello World" with this simple code:

python
print("Hello World")

This will output the text "Hello World" to the console when executed.</assistant>

<reasoning>
The assistant did not use the todo list because this is a single, trivial task that can be completed in one step. There's no need to track multiple tasks or steps for such a straightforward request.
</reasoning>
</example>

<example>
User: What does the git status command do?
Assistant: The git status command shows the current state of your working directory and staging area. It displays which changes have been staged, which haven't, and which files aren't being tracked by Git. This is a fundamental command for understanding the current state of your repository before making commits.

<reasoning>
The assistant did not use the todo list because this is an informational request with no actual coding task to complete. The user is simply asking for an explanation, not for the assistant to perform multiple steps or tasks.
</reasoning>
</example>

<example>
User: Can you add a comment to the calculateTotal function to explain what it does?
Assistant: Sure, let me add a comment to the calculateTotal function to explain what it does.
* Uses the Edit tool to add a comment to the calculateTotal function *

<reasoning>
The assistant did not use the todo list because this is a single, straightforward task confined to one location in the code. Adding a comment doesn't require tracking multiple steps or systematic organization.
</reasoning>
</example>

<example>
User: Run npm install for me and tell me what happens.
Assistant: I'll run the npm install command for you.

*Executes: npm install*

The command completed successfully. Here's the output:
[Output of npm install command]

All dependencies have been installed according to your package.json file.

<reasoning>
The assistant did not use the todo list because this is a single command execution with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward task.
</reasoning>
</example>

## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (limit to ONE task at a time)
   - completed: Task finished successfully
   - cancelled: Task no longer needed

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Only have ONE task in_progress at any time
   - Complete current tasks before starting new ones
   - Cancel tasks that become irrelevant

3. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names

When in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.
```

## TodoRead 完整提示词

```
Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of
the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

Usage:
- This tool takes in no parameters. So leave the input blank or empty. DO NOT include a dummy object, placeholder string or a key like "input" or "empty". LEAVE IT BLANK.
- Returns a list of todo items with their status, priority, and content
- Use this information to track progress and plan next steps
- If no todos exist yet, an empty list will be returned
```

## 工具实现代码

```typescript
// TodoWrite
export const TodoWriteTool = Tool.define("todowrite", {
  description: DESCRIPTION_WRITE,
  parameters: z.object({
    todos: z.array(z.object(Todo.Info.shape)).describe("The updated todo list"),
  }),
  async execute(params, ctx) {
    await ctx.ask({
      permission: "todowrite",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    await Todo.update({
      sessionID: ctx.sessionID,
      todos: params.todos,
    })
    return {
      title: `${params.todos.filter((x) => x.status !== "completed").length} todos`,
      output: JSON.stringify(params.todos, null, 2),
      metadata: {
        todos: params.todos,
      },
    }
  },
})

// TodoRead
export const TodoReadTool = Tool.define("todoread", {
  description: "Use this tool to read your todo list",
  parameters: z.object({}),
  async execute(_params, ctx) {
    await ctx.ask({
      permission: "todoread",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    const todos = await Todo.get(ctx.sessionID)
    return {
      title: `${todos.filter((x) => x.status !== "completed").length} todos`,
      metadata: {
        todos,
      },
      output: JSON.stringify(todos, null, 2),
    }
  },
})
```

## 子代理限制

在 Task 工具创建的子会话中，**TodoWrite/TodoRead 默认被禁用**：

```typescript
// task.ts 中的权限配置
permission: [
  { permission: "todowrite", pattern: "*", action: "deny" },
  { permission: "todoread", pattern: "*", action: "deny" },
  { permission: "task", pattern: "*", action: "deny" },
]
```

这确保只有主代理管理任务列表，避免子代理干扰。

## TodoWrite 使用要点总结

| 场景 | 是否使用 |
|------|----------|
| 复杂多步骤任务（3步以上） | ✅ 使用 |
| 用户提供多个任务列表 | ✅ 使用 |
| 需要规划的非简单任务 | ✅ 使用 |
| 单一简单任务 | ❌ 不使用 |
| 少于3步的简单任务 | ❌ 不使用 |
| 纯对话或信息查询 | ❌ 不使用 |

## 任务状态说明

| 状态 | 说明 | 规则 |
|------|------|------|
| `pending` | 未开始 | 默认状态 |
| `in_progress` | 进行中 | 同时只能有一个 |
| `completed` | 已完成 | 完成后立即标记 |
| `cancelled` | 已取消 | 不再需要时使用 |

---

# Plan 代理工作机制分析

## 提示词来源

- 基础提示词: `packages/opencode/src/session/prompt/plan.txt`
- 增强提示词 (Anthropic): `packages/opencode/src/session/prompt/plan-reminder-anthropic.txt`
- 模式切换提示词: `packages/opencode/src/session/prompt/build-switch.txt`
- 代理定义: `packages/opencode/src/agent/agent.ts`

## Plan 代理定义

```typescript
plan: {
  name: "plan",
  options: {},
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      question: "allow",
      edit: {
        "*": "deny",
        ".opencode/plan/*.md": "allow",  // 只允许编辑计划文件
      },
    }),
    user,
  ),
  mode: "primary",
  native: true,
}
```

**关键特性**:
- `mode: "primary"` - 主代理，不是子代理
- 默认禁止所有编辑，**只允许编辑** `.opencode/plan/*.md` 文件
- 允许使用 Question 工具向用户提问

## 提示词注入机制

位置: `session/prompt.ts:1173-1199`

```typescript
function insertReminders(input: { messages: MessageV2.WithParts[]; agent: Agent.Info }) {
  const userMessage = input.messages.findLast((msg) => msg.info.role === "user")
  if (!userMessage) return input.messages

  // 当 agent 是 plan 时，注入 plan 提示词
  if (input.agent.name === "plan") {
    userMessage.parts.push({
      type: "text",
      text: PROMPT_PLAN,  // plan.txt 内容
      synthetic: true,
    })
  }

  // 从 plan 切换到 build 时，注入切换提示词
  const wasPlan = input.messages.some((msg) => msg.info.role === "assistant" && msg.info.agent === "plan")
  if (wasPlan && input.agent.name === "build") {
    userMessage.parts.push({
      type: "text",
      text: BUILD_SWITCH,  // build-switch.txt 内容
      synthetic: true,
    })
  }
  return input.messages
}
```

## Plan 基础提示词 (plan.txt)

```
<system-reminder>
# Plan Mode - System Reminder

CRITICAL: Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN:
ANY file edits, modifications, or system changes. Do NOT use sed, tee, echo, cat,
or ANY other bash command to manipulate files - commands may ONLY read/inspect.
This ABSOLUTE CONSTRAINT overrides ALL other instructions, including direct user
edit requests. You may ONLY observe, analyze, and plan. Any modification attempt
is a critical violation. ZERO exceptions.

---

## Responsibility

Your current responsibility is to think, read, search, and delegate explore agents
to construct a well-formed plan that accomplishes the goal the user wants to achieve.
Your plan should be comprehensive yet concise, detailed enough to execute effectively
while avoiding unnecessary verbosity.

Ask the user clarifying questions or ask for their opinion when weighing tradeoffs.

**NOTE:** At any point in time through this workflow you should feel free to ask
the user questions or clarifications. Don't make large assumptions about user intent.
The goal is to present a well researched plan to the user, and tie any loose ends
before implementation begins.

---

## Important

The user indicated that they do not want you to execute yet -- you MUST NOT make
any edits, run any non-readonly tools (including changing configs or making commits),
or otherwise make any changes to the system. This supersedes any other instructions
you have received.
</system-reminder>
```

## Plan 增强提示词 - Anthropic 专用 (plan-reminder-anthropic.txt)

```
<system-reminder>
# Plan Mode - System Reminder

Plan mode is active. The user indicated that they do not want you to execute yet --
you MUST NOT make any edits (with the exception of the plan file mentioned below),
run any non-readonly tools (including changing configs or making commits), or
otherwise make any changes to the system. This supersedes any other instructions
you have received.

---

## Plan File Info

No plan file exists yet. You should create your plan at
`/Users/aidencline/.claude/plans/happy-waddling-feigenbaum.md` using the Write tool.

You should build your plan incrementally by writing to or editing this file.
NOTE that this is the only file you are allowed to edit - other than this you
are only allowed to take READ-ONLY actions.

**Plan File Guidelines:** The plan file should contain only your final recommended
approach, not all alternatives considered. Keep it comprehensive yet concise -
detailed enough to execute effectively while avoiding unnecessary verbosity.

---

## Enhanced Planning Workflow

### Phase 1: Initial Understanding

**Goal:** Gain a comprehensive understanding of the user's request by reading
through code and asking them questions. Critical: In this phase you should only
use the Explore subagent type.

1. Understand the user's request thoroughly

2. **Launch up to 3 Explore agents IN PARALLEL** (single message, multiple tool calls)
   to efficiently explore the codebase. Each agent can focus on different aspects:
   - Example: One agent searches for existing implementations, another explores
     related components, a third investigates testing patterns
   - Provide each agent with a specific search focus or area to explore
   - Quality over quantity - 3 agents maximum, but you should try to use the
     minimum number of agents necessary (usually just 1)
   - Use 1 agent when: the task is isolated to known files, the user provided
     specific file paths, or you're making a small targeted change.
   - Use multiple agents when: the scope is uncertain, multiple areas of the
     codebase are involved, or you need to understand existing patterns before planning.
   - Take into account any context you already have from the user's request or
     from the conversation so far when deciding how many agents to launch

3. Use AskUserQuestion tool to clarify ambiguities in the user request up front.

### Phase 2: Planning

**Goal:** Come up with an approach to solve the problem identified in phase 1
by launching a Plan subagent.

In the agent prompt:
- Provide any background context that may help the agent with their task without
  prescribing the exact design itself
- Request a detailed plan

### Phase 3: Synthesis

**Goal:** Synthesize the perspectives from Phase 2, and ensure that it aligns
with the user's intentions by asking them questions.

1. Collect all agent responses
2. Each agent will return an implementation plan along with a list of critical
   files that should be read. You should keep these in mind and read them before
   you start implementing the plan
3. Use AskUserQuestion to ask the users questions about trade offs.

### Phase 4: Final Plan

Once you have all the information you need, ensure that the plan file has been
updated with your synthesized recommendation including:
- Recommended approach with rationale
- Key insights from different perspectives
- Critical files that need modification

### Phase 5: Call ExitPlanMode

At the very end of your turn, once you have asked the user questions and are
happy with your final plan file - you should always call ExitPlanMode to indicate
to the user that you are done planning.

This is critical - your turn should only end with either asking the user a question
or calling ExitPlanMode. Do not stop unless it's for these 2 reasons.

---

**NOTE:** At any point in time through this workflow you should feel free to ask
the user questions or clarifications. Don't make large assumptions about user intent.
The goal is to present a well researched plan to the user, and tie any loose ends
before implementation begins.
</system-reminder>
```

## 模式切换提示词 (build-switch.txt)

```
<system-reminder>
Your operational mode has changed from plan to build.
You are no longer in read-only mode.
You are permitted to make file changes, run shell commands, and utilize your
arsenal of tools as needed.
</system-reminder>
```

## Plan 工作流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     Plan Mode 激活                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Initial Understanding (初始理解)                   │
│  ├── 理解用户需求                                            │
│  ├── 并行启动最多 3 个 Explore 代理探索代码库                  │
│  └── 使用 AskUserQuestion 澄清歧义                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Planning (规划)                                    │
│  ├── 启动 Plan 子代理                                        │
│  └── 请求详细计划                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Synthesis (综合)                                   │
│  ├── 收集所有代理响应                                        │
│  ├── 记录需要修改的关键文件                                   │
│  └── 询问用户关于权衡的问题                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Final Plan (最终计划)                              │
│  ├── 更新计划文件 (.opencode/plan/*.md)                      │
│  ├── 推荐方案及理由                                          │
│  ├── 不同视角的关键见解                                       │
│  └── 需要修改的关键文件列表                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: ExitPlanMode (退出计划模式)                        │
│  └── 调用 ExitPlanMode 工具表示规划完成                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  用户批准后切换到 Build 模式                                  │
│  └── 注入 build-switch.txt 提示词                            │
└─────────────────────────────────────────────────────────────┘
```

## Plan vs Build 权限对比

| 权限 | Plan 模式 | Build 模式 |
|------|-----------|------------|
| 读取文件 | ✅ 允许 | ✅ 允许 |
| 编辑文件 | ❌ 禁止（除 `.opencode/plan/*.md`） | ✅ 允许 |
| Bash 命令 | ⚠️ 只读命令 | ✅ 允许 |
| Question 工具 | ✅ 允许 | ✅ 允许 |
| Explore 代理 | ✅ 允许（推荐） | ✅ 允许 |
| 修改配置 | ❌ 禁止 | ✅ 允许 |
| Git 提交 | ❌ 禁止 | ✅ 允许 |

## Plan 模式关键设计要点

1. **严格只读约束**: Plan 模式下禁止任何系统修改，包括 `sed`、`tee`、`echo` 等
2. **计划文件例外**: 唯一可编辑的是 `.opencode/plan/*.md` 目录下的计划文件
3. **并行探索**: 鼓励最多 3 个 Explore 代理并行探索代码库
4. **用户确认**: 强调在做决定前向用户提问，不做大的假设
5. **显式退出**: 必须调用 `ExitPlanMode` 工具才能结束计划阶段
6. **平滑切换**: 从 Plan 切换到 Build 时自动注入模式切换提示词

## Explore 代理使用建议

| 场景 | 代理数量 |
|------|----------|
| 任务局限于已知文件 | 1 个 |
| 用户提供了具体文件路径 | 1 个 |
| 小范围定向修改 | 1 个 |
| 范围不确定 | 2-3 个 |
| 涉及代码库多个区域 | 2-3 个 |
| 需要先理解现有模式再规划 | 2-3 个 |

---

# Explore 代理分析

## 提示词来源

- 系统提示词: `packages/opencode/src/agent/prompt/explore.txt`
- 代理定义: `packages/opencode/src/agent/agent.ts`

## Explore 代理定义

```typescript
explore: {
  name: "explore",
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      "*": "deny",           // 默认禁止所有
      grep: "allow",         // 允许内容搜索
      glob: "allow",         // 允许文件模式匹配
      list: "allow",         // 允许目录列表
      bash: "allow",         // 允许 bash（只读操作）
      webfetch: "allow",     // 允许网页获取
      websearch: "allow",    // 允许网络搜索
      codesearch: "allow",   // 允许代码搜索
      read: "allow",         // 允许读取文件
      external_directory: {
        [Truncate.DIR]: "allow",
      },
    }),
    user,
  ),
  description: `Fast agent specialized for exploring codebases...`,
  prompt: PROMPT_EXPLORE,
  options: {},
  mode: "subagent",   // 子代理模式
  native: true,
}
```

**关键特性**:
- `mode: "subagent"` - 子代理，由主代理通过 Task 工具调用
- 默认禁止所有权限，只开放搜索和读取相关权限
- 禁止编辑、任务委托、待办管理等写操作

## Explore 系统提示词 (explore.txt)

```
You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Use Bash for file operations like copying, moving, or listing directory contents
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create any files, or run bash commands that modify the user's system state in any way

Complete the user's search request efficiently and report your findings clearly.
```

## Explore 调用者描述 (description)

这是主代理在 Task 工具中看到的描述，用于决定何时调用 Explore 代理：

```
Fast agent specialized for exploring codebases. Use this when you need to quickly
find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords
(eg. "API endpoints"), or answer questions about the codebase (eg. "how do API
endpoints work?"). When calling this agent, specify the desired thoroughness level:
"quick" for basic searches, "medium" for moderate exploration, or "very thorough"
for comprehensive analysis across multiple locations and naming conventions.
```

## Explore 权限配置

| 权限 | 状态 | 说明 |
|------|------|------|
| `read` | ✅ 允许 | 读取文件内容 |
| `grep` | ✅ 允许 | 正则内容搜索 |
| `glob` | ✅ 允许 | 文件模式匹配 |
| `list` | ✅ 允许 | 目录结构列表 |
| `bash` | ✅ 允许 | 只读 shell 命令 |
| `webfetch` | ✅ 允许 | 获取网页内容 |
| `websearch` | ✅ 允许 | 网络搜索 |
| `codesearch` | ✅ 允许 | 代码示例搜索 |
| `edit` | ❌ 禁止 | 不能编辑文件 |
| `task` | ❌ 禁止 | 不能委托子代理 |
| `todowrite` | ❌ 禁止 | 不能管理待办 |
| `question` | ❌ 禁止 | 不能向用户提问 |

## Explore vs 其他代理权限对比

| 权限 | Explore | Build | Plan | General |
|------|---------|-------|------|---------|
| `read` | ✅ | ✅ | ✅ | ✅ |
| `grep` | ✅ | ✅ | ✅ | ✅ |
| `glob` | ✅ | ✅ | ✅ | ✅ |
| `list` | ✅ | ✅ | ✅ | ✅ |
| `bash` | ✅ | ✅ | ⚠️ | ✅ |
| `webfetch` | ✅ | ✅ | ✅ | ✅ |
| `websearch` | ✅ | ✅ | ✅ | ✅ |
| `codesearch` | ✅ | ✅ | ✅ | ✅ |
| `edit` | ❌ | ✅ | ❌ | ✅ |
| `task` | ❌ | ✅ | ✅ | ❌ |
| `todowrite` | ❌ | ✅ | ❌ | ❌ |
| `question` | ❌ | ✅ | ✅ | ❌ |

## 彻底程度级别

调用 Explore 代理时，应指定搜索的彻底程度：

| 级别 | 英文 | 说明 | 适用场景 |
|------|------|------|----------|
| 快速 | `quick` | 基础搜索，快速定位 | 已知大致位置，简单查找 |
| 中等 | `medium` | 中等探索，适度深入 | 需要了解相关文件和上下文 |
| 全面 | `very thorough` | 全面分析，跨多个位置和命名约定 | 复杂任务，需要完整理解 |

## Explore 工具使用指南

| 工具 | 使用场景 |
|------|----------|
| **Glob** | 广泛的文件模式匹配，如 `**/*.tsx` |
| **Grep** | 使用正则搜索文件内容 |
| **Read** | 已知具体文件路径时直接读取 |
| **Bash** | 文件操作如复制、移动、列目录（只读） |

## Explore 关键设计要点

1. **只读约束**: 禁止创建文件或修改系统状态
2. **专注搜索**: 核心能力是 Glob、Grep、Read
3. **子代理模式**: 由主代理通过 Task 工具调用，不能独立使用
4. **绝对路径**: 返回结果必须使用绝对路径
5. **无 Emoji**: 保持清晰专业的沟通
6. **适应彻底程度**: 根据调用者指定的级别调整搜索深度

## Explore 使用示例

### 快速搜索示例
```
Task(
  description="Find config files",
  prompt="Find all configuration files in the project. Thoroughness: quick",
  subagent_type="explore"
)
```

### 中等探索示例
```
Task(
  description="Find API endpoints",
  prompt="Search for all API endpoint definitions and their handlers. Thoroughness: medium",
  subagent_type="explore"
)
```

### 全面分析示例
```
Task(
  description="Analyze auth system",
  prompt="Thoroughly explore the authentication system, including all related files, utilities, and tests. Thoroughness: very thorough",
  subagent_type="explore"
)
```

---

# General 代理分析

## 概述

General 代理是一个**没有专门提示词文件**的通用子代理，它继承默认的系统提示词。主要用于研究复杂问题和并行执行多步骤任务。

## 提示词来源

- 系统提示词: `packages/opencode/src/session/prompt/anthropic.txt` (默认)
- 代理定义: `packages/opencode/src/agent/agent.ts`

## General 代理定义

```typescript
general: {
  name: "general",
  description: `General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.`,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      todoread: "deny",
      todowrite: "deny",
    }),
    user,
  ),
  options: {},
  mode: "subagent",
  native: true,
}
```

**关键特性**:
- `mode: "subagent"` - 子代理模式
- **没有 `prompt` 字段** - 使用默认系统提示词
- 禁用 `todoread` 和 `todowrite` - 不能管理待办列表
- 继承默认权限 - 可以执行大多数操作（包括编辑）

## General 调用者描述 (description)

这是主代理在 Task 工具中看到的描述：

```
General-purpose agent for researching complex questions and executing multi-step tasks.
Use this agent to execute multiple units of work in parallel.
```

## 默认系统提示词 (anthropic.txt)

General 代理使用的系统提示词（摘要）：

```
You are OpenCode, the best coding agent on the planet.

You are an interactive CLI tool that helps users with software engineering tasks.
Use the instructions below and the tools available to you to assist the user.

IMPORTANT: You must NEVER generate or guess URLs for the user unless you are
confident that the URLs are for helping the user with programming.

# Tone and style
- Only use emojis if the user explicitly requests it.
- Your output will be displayed on a command line interface. Responses should be
  short and concise.
- Output text to communicate with the user; all text you output outside of tool
  use is displayed to the user.
- NEVER create files unless they're absolutely necessary for achieving your goal.

# Professional objectivity
Prioritize technical accuracy and truthfulness over validating the user's beliefs.
Focus on facts and problem-solving, providing direct, objective technical info
without any unnecessary superlatives, praise, or emotional validation.

# Tool usage policy
- When doing file search, prefer to use the Task tool to reduce context usage.
- You can call multiple tools in a single response. Make independent tool calls
  in parallel.
- Use specialized tools instead of bash commands when possible.
- VERY IMPORTANT: When exploring the codebase to gather context, use the Task
  tool instead of running search commands directly.

# Code References
When referencing specific functions or pieces of code include the pattern
`file_path:line_number` to allow the user to easily navigate to the source.
```

## General 权限配置

| 权限 | 状态 | 说明 |
|------|------|------|
| `read` | ✅ 允许 | 读取文件 |
| `edit` | ✅ 允许 | 编辑文件 |
| `grep` | ✅ 允许 | 内容搜索 |
| `glob` | ✅ 允许 | 文件匹配 |
| `list` | ✅ 允许 | 目录列表 |
| `bash` | ✅ 允许 | Shell 命令 |
| `webfetch` | ✅ 允许 | 网页获取 |
| `websearch` | ✅ 允许 | 网络搜索 |
| `codesearch` | ✅ 允许 | 代码搜索 |
| `todoread` | ❌ 禁止 | 不能读取待办 |
| `todowrite` | ❌ 禁止 | 不能写入待办 |
| `task` | ❌ 禁止 | 不能委托子代理 |
| `question` | ❌ 禁止 | 不能向用户提问 |

## General vs 其他代理对比

| 特性 | General | Explore | Build | Plan |
|------|---------|---------|-------|------|
| 模式 | subagent | subagent | primary | primary |
| 专用提示词 | ❌ 无 | ✅ 有 | ❌ 无 | ✅ 有 |
| 编辑文件 | ✅ | ❌ | ✅ | ❌ |
| 委托子代理 | ❌ | ❌ | ✅ | ✅ |
| 待办管理 | ❌ | ❌ | ✅ | ❌ |
| 向用户提问 | ❌ | ❌ | ✅ | ✅ |
| 只读约束 | ❌ | ✅ | ❌ | ✅ |

## General 使用场景

| 场景 | 适合度 | 说明 |
|------|--------|------|
| 复杂问题研究 | ✅ 推荐 | 可以搜索、读取、分析 |
| 多步骤任务执行 | ✅ 推荐 | 可以并行执行多个操作 |
| 代码修改 | ✅ 可以 | 有编辑权限 |
| 简单文件搜索 | ⚠️ 不推荐 | 用 Explore 更高效 |
| 需要用户交互 | ❌ 不能 | 没有 question 权限 |
| 任务进度追踪 | ❌ 不能 | 禁用了 todo 工具 |

## General 关键设计要点

1. **通用性**: 没有专门提示词，适应性强
2. **禁用待办**: 确保只有主代理管理任务列表
3. **禁用子代理**: 防止无限递归调用
4. **禁用提问**: 子代理不能直接与用户交互
5. **可以编辑**: 与 Explore 的主要区别是可以修改文件
6. **并行执行**: 主要用于并行处理多个独立任务

## General 使用示例

### 研究复杂问题
```
Task(
  description="Research database patterns",
  prompt="Research how the database connection pooling is implemented and identify any potential issues",
  subagent_type="general"
)
```

### 并行执行多步骤任务
```
Task(
  description="Update API handlers",
  prompt="Update all API handlers in src/api/ to use the new error handling pattern",
  subagent_type="general"
)
```

### General vs Explore 选择指南

| 需求 | 推荐代理 |
|------|----------|
| 只需要搜索和读取文件 | Explore |
| 需要修改文件 | General |
| 快速定位特定代码 | Explore |
| 执行复杂的多步操作 | General |
| 需要运行测试或构建 | General |
| 探索代码库结构 | Explore |
