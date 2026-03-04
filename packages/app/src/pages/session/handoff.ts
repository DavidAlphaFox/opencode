import type { SelectedLineRange } from "@/context/file"

/**
 * 会话交接数据结构，包含提示词和文件选择范围
 */
type HandoffSession = {
  prompt: string
  files: Record<string, SelectedLineRange | null>
}

const MAX = 40

const store = {
  session: new Map<string, HandoffSession>(),
  terminal: new Map<string, string[]>(),
}

/**
 * 更新 Map 中的键值对，保持 Map 大小不超过最大值
 * @param map - 要操作的 Map
 * @param key - 键
 * @param value - 值
 */
const touch = <K, V>(map: Map<K, V>, key: K, value: V) => {
  map.delete(key)
  map.set(key, value)
  while (map.size > MAX) {
    const first = map.keys().next().value
    if (first === undefined) return
    map.delete(first)
  }
}

/**
 * 设置会话交接数据
 * @param key - 会话标识符
 * @param patch - 要更新的部分数据
 */
export const setSessionHandoff = (key: string, patch: Partial<HandoffSession>) => {
  const prev = store.session.get(key) ?? { prompt: "", files: {} }
  touch(store.session, key, { ...prev, ...patch })
}

/**
 * 获取会话交接数据
 * @param key - 会话标识符
 * @returns 会话交接数据，不存在则返回 undefined
 */
export const getSessionHandoff = (key: string) => store.session.get(key)

/**
 * 设置终端交接数据
 * @param key - 终端标识符
 * @value - 终端输出内容数组
 */
export const setTerminalHandoff = (key: string, value: string[]) => {
  touch(store.terminal, key, value)
}

export const getTerminalHandoff = (key: string) => store.terminal.get(key)
