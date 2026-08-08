import launch from "cross-spawn"
import { type Config } from "./gen/types.gen.js"
import { stop, bindAbort } from "../process.js"

/**
 * 服务器启动选项
 * - hostname: 服务器监听的主机名
 * - port: 服务器监听的端口
 * - signal: 用于取消服务器启动的 AbortSignal
 * - timeout: 等待服务器启动的超时时间（毫秒）
 * - config: Opencode 配置对象
 */
export type ServerOptions = {
  hostname?: string
  port?: number
  signal?: AbortSignal
  timeout?: number
  config?: Config
}

/**
 * TUI（终端用户界面）启动选项
 * - project: 项目路径
 * - model: 使用的模型
 * - session: 会话 ID
 * - agent: 使用的代理
 * - signal: 用于取消启动的 AbortSignal
 * - config: Opencode 配置对象
 */
export type TuiOptions = {
  project?: string
  model?: string
  session?: string
  agent?: string
  signal?: AbortSignal
  config?: Config
}

/**
 * 启动本地 Opencode v2 服务器进程
 * - 启动 opencode serve 命令
 * - 等待服务器就绪并解析输出获取 URL
 * - 返回服务器 URL 和关闭方法
 */
export async function createOpencodeServer(options?: ServerOptions) {
  options = Object.assign(
    {
      hostname: "127.0.0.1",
      port: 4096,
      timeout: 5000,
    },
    options ?? {},
  )

  const args = [`serve`, `--hostname=${options.hostname}`, `--port=${options.port}`]
  if (options.config?.logLevel) args.push(`--log-level=${options.config.logLevel}`)

  const proc = launch(`opencode`, args, {
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {}),
    },
  })
  let clear = () => {}

  const url = await new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => {
      clear()
      stop(proc)
      reject(new Error(`Timeout waiting for server to start after ${options.timeout}ms`))
    }, options.timeout)
    let output = ""
    let resolved = false
    proc.stdout?.on("data", (chunk) => {
      if (resolved) return
      output += chunk.toString()
      const lines = output.split("\n")
      for (const line of lines) {
        if (line.startsWith("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
          if (!match) {
            clear()
            stop(proc)
            clearTimeout(id)
            reject(new Error(`Failed to parse server url from output: ${line}`))
            return
          }
          clearTimeout(id)
          resolved = true
          resolve(match[1]!)
          return
        }
      }
    })
    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString()
    })
    proc.on("exit", (code) => {
      clearTimeout(id)
      let msg = `Server exited with code ${code}`
      if (output.trim()) {
        msg += `\nServer output: ${output}`
      }
      reject(new Error(msg))
    })
    proc.on("error", (error) => {
      clearTimeout(id)
      reject(error)
    })
    clear = bindAbort(proc, options.signal, () => {
      clearTimeout(id)
      reject(options.signal?.reason)
    })
  })

  return {
    url,
    close() {
      clear()
      stop(proc)
    },
  }
}

/**
 * 启动 Opencode v2 终端界面（TUI）
 * - 通过 opencode 命令行启动交互式界面
 * - 支持指定项目、模型、会话和代理参数
 * - 返回进程关闭方法
 */
export function createOpencodeTui(options?: TuiOptions) {
  const args = []

  if (options?.project) {
    args.push(`--project=${options.project}`)
  }
  if (options?.model) {
    args.push(`--model=${options.model}`)
  }
  if (options?.session) {
    args.push(`--session=${options.session}`)
  }
  if (options?.agent) {
    args.push(`--agent=${options.agent}`)
  }

  const proc = launch(`opencode`, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options?.config ?? {}),
    },
  })

  const clear = bindAbort(proc, options?.signal)

  return {
    close() {
      clear()
      stop(proc)
    },
  }
}
