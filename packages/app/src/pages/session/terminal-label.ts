import { isDefaultTitle as isDefaultTerminalTitle } from "@/context/terminal-title"

/**
 * 生成终端标签页的显示标题
 * @param input - 包含标题和翻译函数的配置对象
 * @returns 格式化后的终端标题
 */
export const terminalTabLabel = (input: {
  title?: string
  titleNumber?: number
  t: (key: string, vars?: Record<string, string | number | boolean>) => string
}) => {
  const title = input.title ?? ""
  const number = input.titleNumber ?? 0
  const isDefaultTitle = Number.isFinite(number) && number > 0 && isDefaultTerminalTitle(title, number)

  if (title && !isDefaultTitle) return title
  if (number > 0) return input.t("terminal.title.numbered", { number })
  if (title) return title
  return input.t("terminal.title")
}
