import type {
  Agent,
  Config,
  LspStatus,
  Message,
  Part,
  Path,
  PermissionRequest,
  QuestionRequest,
  ReferenceInfo,
  Session,
  SessionStatus,
  Todo,
  VcsInfo,
} from "@opencode-ai/sdk/v2/client"
import type { FileDiffInfo } from "@opencode-ai/client/promise"
import { NormalizedProviderListResponse } from "@opencode-ai/session-ui/context"
import type { CommandInfo, McpResource, McpServer, SessionMessageInfo } from "@opencode-ai/client/promise"
import type { Accessor } from "solid-js"
import type { SetStoreFunction, Store } from "solid-js/store"

/**
 * 项目元数据
 */
export type ProjectMeta = {
  name?: string
  icon?: {
    override?: string
    color?: string
  }
  commands?: {
    start?: string
  }
}

/**
 * 目录级别的应用状态
 */
export type State = {
  status: "loading" | "partial" | "complete"
  agent: Agent[]
  command: CommandInfo[]
  reference: ReferenceInfo[]
  project: string
  projectMeta: ProjectMeta | undefined
  icon: string | undefined
  provider_ready: boolean
  provider: NormalizedProviderListResponse
  config: Config
  path: Path
  session: Session[]
  sessionTotal: number
  session_status: {
    [sessionID: string]: SessionStatus
  }
  session_working(id: string): boolean
  session_diff: {
    [sessionID: string]: FileDiffInfo[]
  }
  todo: {
    [sessionID: string]: Todo[]
  }
  permission: {
    [sessionID: string]: PermissionRequest[]
  }
  question: {
    [sessionID: string]: QuestionRequest[]
  }
  mcp_ready: boolean
  mcp: {
    [name: string]: McpServer["status"]
  }
  mcp_resource: {
    [key: string]: McpResource
  }
  lsp_ready: boolean
  lsp: LspStatus[]
  vcs: VcsInfo | undefined
  limit: number
  message: {
    [sessionID: string]: Message[]
  }
  session_message: {
    [sessionID: string]: SessionMessageInfo[]
  }
  part: {
    [messageID: string]: Part[]
  }
  part_text_accum_delta: {
    [partID: string]: string
  }
}

/**
 * VCS缓存
 */
export type VcsCache = {
  store: Store<{ value: VcsInfo | undefined }>
  setStore: SetStoreFunction<{ value: VcsInfo | undefined }>
  ready: Accessor<boolean>
}

/**
 * 项目元数据缓存
 */
export type MetaCache = {
  store: Store<{ value: ProjectMeta | undefined }>
  setStore: SetStoreFunction<{ value: ProjectMeta | undefined }>
  ready: Accessor<boolean>
}

/**
 * 项目图标缓存
 */
export type IconCache = {
  store: Store<{ value: string | undefined }>
  setStore: SetStoreFunction<{ value: string | undefined }>
  ready: Accessor<boolean>
}

/**
 * 子存储选项
 */
export type ChildOptions = {
  bootstrap?: boolean
  mcp?: boolean
}

/**
 * 目录状态
 */
export type DirState = {
  lastAccessAt: number
}

/**
 * 淘汰计划参数
 */
export type EvictPlan = {
  stores: string[]
  state: Map<string, DirState>
  pins: Set<string>
  max: number
  ttl: number
  now: number
}

/**
 * 释放检查参数
 */
export type DisposeCheck = {
  directory: string
  hasStore: boolean
  pinned: boolean
  booting: boolean
  loadingSessions: boolean
}

/**
 * 最大目录存储数量
 */
export const MAX_DIR_STORES = 30

/**
 * 目录空闲超时（毫秒）
 */
export const DIR_IDLE_TTL_MS = 20 * 60 * 1000

/**
 * 会话最近窗口（毫秒）
 */
export const SESSION_RECENT_WINDOW = 4 * 60 * 60 * 1000

/**
 * 最近会话限制数量
 */
export const SESSION_RECENT_LIMIT = 50
