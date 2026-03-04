/** 深度链接事件名称 */
export const deepLinkEvent = "opencode:deep-link"

/**
 * 解析深度链接URL
 * 提取 opencode://open-project?directory=xxx 格式中的目录路径
 * @param input - 深度链接URL字符串
 * @returns 目录路径或undefined
 */
export const parseDeepLink = (input: string) => {
  if (!input.startsWith("opencode://")) return
  if (typeof URL.canParse === "function" && !URL.canParse(input)) return
  const url = (() => {
    try {
      return new URL(input)
    } catch {
      return undefined
    }
  })()
  if (!url) return
  if (url.hostname !== "open-project") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  return directory
}

/**
 * 收集所有有效的项目深度链接
 * @param urls - URL列表
 * @returns 有效目录路径数组
 */
export const collectOpenProjectDeepLinks = (urls: string[]) =>
  urls.map(parseDeepLink).filter((directory): directory is string => !!directory)

/** OpenCode 窗口全局对象类型 */
type OpenCodeWindow = Window & {
  __OPENCODE__?: {
    deepLinks?: string[]
  }
}

/**
 * 提取并清除待处理的深度链接
 * @param target - 窗口对象
 * @returns 待处理的深度链接数组
 */
export const drainPendingDeepLinks = (target: OpenCodeWindow) => {
  const pending = target.__OPENCODE__?.deepLinks ?? []
  if (pending.length === 0) return []
  if (target.__OPENCODE__) target.__OPENCODE__.deepLinks = []
  return pending
}
