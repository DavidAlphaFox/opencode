import { getFilename } from "@opencode-ai/util/path"
import { type Session } from "@opencode-ai/sdk/v2/client"

/**
 * 获取工作区目录的标准化键
 * 处理 Windows 和 Unix 路径格式，将驱动器号或根路径转换为统一格式
 */
export const workspaceKey = (directory: string) => {
  const drive = directory.match(/^([A-Za-z]:)[\\/]+$/)
  if (drive) return `${drive[1]}${directory.includes("\\") ? "\\" : "/"}`
  if (/^[\\/]+$/.test(directory)) return directory.includes("\\") ? "\\" : "/"
  return directory.replace(/[\\/]+$/, "")
}

/**
 * 创建会话排序函数
 * 按最近活动时间排序，最近更新的一分钟内按ID排序，否则按更新时间倒序
 */
export function sortSessions(now: number) {
  const oneMinuteAgo = now - 60 * 1000
  return (a: Session, b: Session) => {
    const aUpdated = a.time.updated ?? a.time.created
    const bUpdated = b.time.updated ?? b.time.created
    const aRecent = aUpdated > oneMinuteAgo
    const bRecent = bUpdated > oneMinuteAgo
    if (aRecent && bRecent) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    if (aRecent && !bRecent) return -1
    if (!aRecent && bRecent) return 1
    return bUpdated - aUpdated
  }
}

/**
 * 检查会话是否为根级可见会话
 * 条件：工作区匹配、无父会话、未被归档
 */
export const isRootVisibleSession = (session: Session, directory: string) =>
  workspaceKey(session.directory) === workspaceKey(directory) && !session.parentID && !session.time?.archived

/**
 * 获取排序后的根级会话列表
 */
export const sortedRootSessions = (store: { session: Session[]; path: { directory: string } }, now: number) =>
  store.session.filter((session) => isRootVisibleSession(session, store.path.directory)).sort(sortSessions(now))

/**
 * 获取最近更新的根级会话
 */
export const latestRootSession = (stores: { session: Session[]; path: { directory: string } }[], now: number) =>
  stores
    .flatMap((store) => store.session.filter((session) => isRootVisibleSession(session, store.path.directory)))
    .sort(sortSessions(now))[0]

/**
 * 检查请求中是否包含指定权限
 * @param request - 权限请求对象
 * @param include - 过滤函数，用于检查具体权限
 */
export function hasProjectPermissions<T>(
  request: Record<string, T[] | undefined>,
  include: (item: T) => boolean = () => true,
) {
  return Object.values(request).some((list) => list?.some(include))
}

/**
 * 构建父子会话映射
 * @param sessions - 会话列表
 * @returns 父会话ID到子会话ID数组的映射
 */
export const childMapByParent = (sessions: Session[]) => {
  const map = new Map<string, string[]>()
  for (const session of sessions) {
    if (!session.parentID) continue
    const existing = map.get(session.parentID)
    if (existing) {
      existing.push(session.id)
      continue
    }
    map.set(session.parentID, [session.id])
  }
  return map
}

/**
 * 从拖拽事件中提取会话ID
 * @param event - 拖拽事件对象
 * @returns 会话ID或undefined
 */
export function getDraggableId(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined
  if (!("draggable" in event)) return undefined
  const draggable = (event as { draggable?: { id?: unknown } }).draggable
  if (!draggable) return undefined
  return typeof draggable.id === "string" ? draggable.id : undefined
}

/**
 * 获取项目的显示名称
 * 优先使用名称，否则使用工作区目录的文件名
 */
export const displayName = (project: { name?: string; worktree: string }) =>
  project.name || getFilename(project.worktree)

/**
 * 提取错误消息
 * 优先从错误对象的data.message获取，其次使用Error的message，最后返回备用消息
 */
export const errorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

/**
 * 计算工作区排序顺序
 * 本地工作区优先，然后按持久化顺序排列，其余工作区按发现顺序追加
 * @param local - 本地工作区目录
 * @param dirs - 所有工作区目录列表
 * @param persisted - 持久化的排序顺序
 */
export const effectiveWorkspaceOrder = (local: string, dirs: string[], persisted?: string[]) => {
  const root = workspaceKey(local)
  const live = new Map<string, string>()

  for (const dir of dirs) {
    const key = workspaceKey(dir)
    if (key === root) continue
    if (!live.has(key)) live.set(key, dir)
  }

  if (!persisted?.length) return [local, ...live.values()]

  const result = [local]
  for (const dir of persisted) {
    const key = workspaceKey(dir)
    if (key === root) continue
    const match = live.get(key)
    if (!match) continue
    result.push(match)
    live.delete(key)
  }

  return [...result, ...live.values()]
}

export const syncWorkspaceOrder = effectiveWorkspaceOrder
