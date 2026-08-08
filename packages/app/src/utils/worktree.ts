import { ScopedKey, type ServerScope } from "@/utils/server-scope"

/**
 * 规范化目录路径
 * @param directory 目录路径
 * @returns 规范化后的路径
 */
const normalize = (directory: string) => directory.replace(/[\\/]+$/, "")
const key = (scope: ServerScope, directory: string) => ScopedKey.from(scope, normalize(directory))

/**
 * 工作树状态
 */
type State =
  | {
      status: "pending"
    }
  | {
      status: "ready"
    }
  | {
      status: "failed"
      message: string
    }

const state = new Map<string, State>()
const waiters = new Map<
  string,
  {
    promise: Promise<State>
    resolve: (state: State) => void
  }
>()

/**
 * 创建延迟解析的 Promise
 * @returns 包含 promise 和 resolve 函数的对象
 */
function deferred() {
  const box = { resolve: (_: State) => {} }
  const promise = new Promise<State>((resolve) => {
    box.resolve = resolve
  })
  return { promise, resolve: box.resolve }
}

/**
 * 工作树管理器
 */
export const Worktree = {
/**
   * 获取工作树状态
   * @param scope 服务器作用域
   * @param directory 目录路径
   * @returns 工作树状态或 undefined
   */
  get(scope: ServerScope, directory: string) {
    return state.get(key(scope, directory))
  },
/**
   * 设置工作树为待处理状态
   * @param scope 服务器作用域
   * @param directory 目录路径
   */
  pending(scope: ServerScope, directory: string) {
    const id = key(scope, directory)
    const current = state.get(id)
    if (current && current.status !== "pending") return
    state.set(id, { status: "pending" })
  },
/**
   * 设置工作树为就绪状态
   * @param scope 服务器作用域
   * @param directory 目录路径
   */
  ready(scope: ServerScope, directory: string) {
    const id = key(scope, directory)
    const next = { status: "ready" } as const
    state.set(id, next)
    const waiter = waiters.get(id)
    if (!waiter) return
    waiters.delete(id)
    waiter.resolve(next)
  },
/**
   * 设置工作树为失败状态
   * @param scope 服务器作用域
   * @param directory 目录路径
   * @param message 错误信息
   */
  failed(scope: ServerScope, directory: string, message: string) {
    const id = key(scope, directory)
    const next = { status: "failed", message } as const
    state.set(id, next)
    const waiter = waiters.get(id)
    if (!waiter) return
    waiters.delete(id)
    waiter.resolve(next)
  },
/**
   * 等待工作树状态变化
   * @param scope 服务器作用域
   * @param directory 目录路径
   * @returns 状态变化的 Promise
   */
  wait(scope: ServerScope, directory: string) {
    const id = key(scope, directory)
    const current = state.get(id)
    if (current && current.status !== "pending") return Promise.resolve(current)

    const existing = waiters.get(id)
    if (existing) return existing.promise

    const waiter = deferred()

    waiters.set(id, waiter)
    return waiter.promise
  },
}
