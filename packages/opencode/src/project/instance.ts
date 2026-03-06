import { Log } from "@/util/log"
import { Context } from "../util/context"
import { Project } from "./project"
import { State } from "./state"
import { iife } from "@/util/iife"
import { GlobalBus } from "@/bus/global"
import { Filesystem } from "@/util/filesystem"

/**
 * 实例管理模块
 * 负责项目实例的创建、缓存和生命周期管理
 */

interface Context {
  directory: string
  worktree: string
  project: Project.Info
}
const context = Context.create<Context>("instance")
const cache = new Map<string, Promise<Context>>()

const disposal = {
  all: undefined as Promise<void> | undefined,
}

/**
 * 项目实例管理对象
 * 提供项目实例的创建、访问和销毁功能
 */
export const Instance = {
  /**
   * 提供一个项目实例上下文，执行指定函数
   * @param input 包含目录、初始化函数和执行函数的配置对象
   * @returns 返回执行函数的结果
   */
  async provide<R>(input: { directory: string; init?: () => Promise<any>; fn: () => R }): Promise<R> {
    let existing = cache.get(input.directory)
    if (!existing) {
      Log.Default.info("creating instance", { directory: input.directory })
      existing = iife(async () => {
        const { project, sandbox } = await Project.fromDirectory(input.directory)
        const ctx = {
          directory: input.directory,
          worktree: sandbox,
          project,
        }
        await context.provide(ctx, async () => {
          await input.init?.()
        })
        return ctx
      })
      cache.set(input.directory, existing)
    }
    const ctx = await existing
    return context.provide(ctx, async () => {
      return input.fn()
    })
  },
  /** 获取当前实例的工作目录 */
  get directory() {
    return context.use().directory
  },
  /** 获取当前实例的沙箱目录（git worktree） */
  get worktree() {
    return context.use().worktree
  },
  /** 获取当前实例的项目信息 */
  get project() {
    return context.use().project
  },
  /**
   * 检查路径是否在项目边界内
   * 如果路径在 Instance.directory 或 Instance.worktree 内返回 true
   * @param filepath 要检查的文件路径
   */
  containsPath(filepath: string) {
    if (Filesystem.contains(Instance.directory, filepath)) return true
    // Non-git projects set worktree to "/" which would match ANY absolute path.
    // Skip worktree check in this case to preserve external_directory permissions.
    if (Instance.worktree === "/") return false
    return Filesystem.contains(Instance.worktree, filepath)
  },
  /**
   * 创建实例级别的状态管理
   * @param init 状态初始化函数
   * @param dispose 可选的状态销毁函数
   * @returns 返回访问状态的函数
   */
  state<S>(init: () => S, dispose?: (state: Awaited<S>) => Promise<void>): () => S {
    return State.create(() => Instance.directory, init, dispose)
  },
  /**
   * 销毁当前清理相关实例，状态和缓存
   */
  dispose() {
    async
    Log.Default.info("disposing instance", { directory: Instance.directory })
    await State.dispose(Instance.directory)
    cache.delete(Instance.directory)
    GlobalBus.emit("event", {
      directory: Instance.directory,
      payload: {
        type: "server.instance.disposed",
        properties: {
          directory: Instance.directory,
        },
      },
    })
  },
  /**
   * 销毁所有项目实例
   * @returns 返回所有实例清理完成的 Promise
   */
  async disposeAll() {
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      Log.Default.info("disposing all instances")
      const entries = [...cache.entries()]
      for (const [key, value] of entries) {
        if (cache.get(key) !== value) continue

        const ctx = await value.catch((error) => {
          Log.Default.warn("instance dispose failed", { key, error })
          return undefined
        })

        if (!ctx) {
          if (cache.get(key) === value) cache.delete(key)
          continue
        }

        if (cache.get(key) !== value) continue

        await context.provide(ctx, async () => {
          await Instance.dispose()
        })
      }
    }).finally(() => {
      disposal.all = undefined
    })

    return disposal.all
  },
}
