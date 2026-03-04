/**
 * 标题栏历史记录最大条目数
 */
export const MAX_TITLEBAR_HISTORY = 100

/**
 * 标题栏操作类型
 */
export type TitlebarAction = "back" | "forward" | undefined

/**
 * 标题栏历史记录状态
 */
export type TitlebarHistory = {
  stack: string[] // 路径栈
  index: number // 当前索引
  action: TitlebarAction // 当前操作
}

/**
 * 应用当前路径到历史记录
 * @param state 当前历史状态
 * @param current 当前路径
 * @param max 最大历史记录数
 */
export function applyPath(state: TitlebarHistory, current: string, max = MAX_TITLEBAR_HISTORY): TitlebarHistory {
  if (!state.stack.length) {
    const stack = current === "/" ? ["/"] : ["/", current]
    return { stack, index: stack.length - 1, action: undefined }
  }

  const active = state.stack[state.index]
  if (current === active) {
    if (!state.action) return state
    return { ...state, action: undefined }
  }

  if (state.action) return { ...state, action: undefined }

  return pushPath(state, current, max)
}

/**
 * 将新路径推入历史记录
 * @param state 当前历史状态
 * @param path 新路径
 * @param max 最大历史记录数
 */
export function pushPath(state: TitlebarHistory, path: string, max = MAX_TITLEBAR_HISTORY): TitlebarHistory {
  const stack = state.stack.slice(0, state.index + 1).concat(path)
  const next = trimHistory(stack, stack.length - 1, max)
  return { ...state, ...next, action: undefined }
}

/**
 * 裁剪历史记录栈，保持最大长度
 * @param stack 路径栈
 * @param index 当前索引
 * @param max 最大长度
 */
export function trimHistory(stack: string[], index: number, max = MAX_TITLEBAR_HISTORY) {
  if (stack.length <= max) return { stack, index }
  const cut = stack.length - max
  return {
    stack: stack.slice(cut),
    index: Math.max(0, index - cut),
  }
}

/**
 * 后退到上一路径
 * @param state 当前历史状态
 */
export function backPath(state: TitlebarHistory) {
  if (state.index <= 0) return
  const index = state.index - 1
  const to = state.stack[index]
  if (!to) return
  return { state: { ...state, index, action: "back" as const }, to }
}

/**
 * 前进到下一路径
 * @param state 当前历史状态
 */
export function forwardPath(state: TitlebarHistory) {
  if (state.index >= state.stack.length - 1) return
  const index = state.index + 1
  const to = state.stack[index]
  if (!to) return
  return { state: { ...state, index, action: "forward" as const }, to }
}
