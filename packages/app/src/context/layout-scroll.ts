import { createStore, produce } from "solid-js/store"

/**
 * 会话滚动位置
 */
export type SessionScroll = {
  x: number
  y: number
}

/**
 * 滚动位置映射表，键为 tab 标识
 */
type ScrollMap = Record<string, SessionScroll>

/**
 * 创建滚动持久化配置
 */
type Options = {
  /** 防抖延迟（毫秒），默认 200ms */
  debounceMs?: number
  /** 获取指定会话的滚动快照 */
  getSnapshot: (sessionKey: string) => ScrollMap | undefined
  /** 刷新时执行的回调，持久化滚动位置 */
  onFlush: (sessionKey: string, scroll: ScrollMap) => void
}

/**
 * 创建滚动位置持久化管理器
 * 用于在会话之间保存和恢复滚动位置
 */
export function createScrollPersistence(opts: Options) {
  const wait = opts.debounceMs ?? 200
  const [cache, setCache] = createStore<Record<string, ScrollMap>>({})
  const dirty = new Set<string>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  /**
   * 深拷贝滚动映射表
   */
  function clone(input?: ScrollMap) {
    const out: ScrollMap = {}
    if (!input) return out

    for (const key of Object.keys(input)) {
      const pos = input[key]
      if (!pos) continue
      out[key] = { x: pos.x, y: pos.y }
    }

    return out
  }

  /**
   * 初始化会话的滚动数据
   * 从持久化存储中加载数据到内存缓存
   */
  function seed(sessionKey: string) {
    const next = clone(opts.getSnapshot(sessionKey))
    const current = cache[sessionKey]
    if (!current) {
      setCache(sessionKey, next)
      return
    }

    if (Object.keys(current).length > 0) return
    if (Object.keys(next).length === 0) return
    setCache(sessionKey, next)
  }

  /**
   * 获取指定会话和标签页的滚动位置
   */
  function scroll(sessionKey: string, tab: string) {
    seed(sessionKey)
    return cache[sessionKey]?.[tab] ?? opts.getSnapshot(sessionKey)?.[tab]
  }

  /**
   * 调度延迟刷新任务
   * 使用防抖机制避免频繁写入
   */
  function schedule(sessionKey: string) {
    const prev = timers.get(sessionKey)
    if (prev) clearTimeout(prev)
    timers.set(
      sessionKey,
      setTimeout(() => flush(sessionKey), wait),
    )
  }

  /**
   * 设置指定会话和标签页的滚动位置
   */
  function setScroll(sessionKey: string, tab: string, pos: SessionScroll) {
    seed(sessionKey)

    const prev = cache[sessionKey]?.[tab]
    if (prev?.x === pos.x && prev?.y === pos.y) return

    setCache(sessionKey, tab, { x: pos.x, y: pos.y })
    dirty.add(sessionKey)
    schedule(sessionKey)
  }

  /**
   * 将指定会话的滚动位置刷新到持久化存储
   */
  function flush(sessionKey: string) {
    const timer = timers.get(sessionKey)
    if (timer) clearTimeout(timer)
    timers.delete(sessionKey)

    if (!dirty.has(sessionKey)) return
    dirty.delete(sessionKey)

    opts.onFlush(sessionKey, clone(cache[sessionKey]))
  }

  /**
   * 刷新所有脏会话的滚动位置
   */
  function flushAll() {
    const keys = Array.from(dirty)
    if (keys.length === 0) return

    for (const key of keys) {
      flush(key)
    }
  }

  /**
   * 移除指定会话的滚动数据
   */
  function drop(keys: string[]) {
    if (keys.length === 0) return

    for (const key of keys) {
      const timer = timers.get(key)
      if (timer) clearTimeout(timer)
      timers.delete(key)
      dirty.delete(key)
    }

    setCache(
      produce((draft) => {
        for (const key of keys) {
          delete draft[key]
        }
      }),
    )
  }

  /**
   * 清理资源，取消所有定时器
   */
  function dispose() {
    drop(Array.from(timers.keys()))
  }

  return {
    cache,
    drop,
    flush,
    flushAll,
    scroll,
    seed,
    setScroll,
    dispose,
  }
}
