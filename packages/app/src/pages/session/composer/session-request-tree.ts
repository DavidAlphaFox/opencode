import type { PermissionRequest, QuestionRequest, Session } from "@opencode-ai/sdk/v2/client"

/**
 * 从会话树中查找满足条件的请求项
 * @param session - 会话列表
 * @param request - 请求映射表
 * @param sessionID - 当前会话 ID
 * @param include - 过滤条件函数
 * @returns 满足条件的请求项，未找到则返回 undefined
 */
function sessionTreeRequest<T>(
  session: Session[],
  request: Record<string, T[] | undefined>,
  sessionID?: string,
  include: (item: T) => boolean = () => true,
) {
  if (!sessionID) return

  const map = session.reduce((acc, item) => {
    if (!item.parentID) return acc
    const list = acc.get(item.parentID)
    if (list) list.push(item.id)
    if (!list) acc.set(item.parentID, [item.id])
    return acc
  }, new Map<string, string[]>())

  const seen = new Set([sessionID])
  const ids = [sessionID]
  for (const id of ids) {
    const list = map.get(id)
    if (!list) continue
    for (const child of list) {
      if (seen.has(child)) continue
      seen.add(child)
      ids.push(child)
    }
  }

  const id = ids.find((id) => request[id]?.some(include))
  if (!id) return
  return request[id]?.find(include)
}

/**
 * 从会话树中查找权限请求
 * @param session - 会话列表
 * @param request - 权限请求映射表
 * @param sessionID - 当前会话 ID
 * @param include - 可选的过滤条件
 * @returns 权限请求项，未找到则返回 undefined
 */
export function sessionPermissionRequest(
  session: Session[],
  request: Record<string, PermissionRequest[] | undefined>,
  sessionID?: string,
  include?: (item: PermissionRequest) => boolean,
) {
  return sessionTreeRequest(session, request, sessionID, include)
}

/**
 * 从会话树中查找问题请求
 * @param session - 会话列表
 * @param request - 问题请求映射表
 * @param sessionID - 当前会话 ID
 * @param include - 可选的过滤条件
 * @returns 问题请求项，未找到则返回 undefined
 */
export function sessionQuestionRequest(
  session: Session[],
  request: Record<string, QuestionRequest[] | undefined>,
  sessionID?: string,
  include?: (item: QuestionRequest) => boolean,
) {
  return sessionTreeRequest(session, request, sessionID, include)
}
