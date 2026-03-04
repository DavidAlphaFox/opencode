import { batch } from "solid-js"

/**
 * 根据终端 ID 聚焦到对应的终端输入框
 * @param id - 终端的唯一标识符
 * @returns 是否成功聚焦
 */
export const focusTerminalById = (id: string) => {
  const wrapper = document.getElementById(`terminal-wrapper-${id}`)
  const terminal = wrapper?.querySelector('[data-component="terminal"]')
  if (!(terminal instanceof HTMLElement)) return false

  const textarea = terminal.querySelector("textarea")
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.focus()
    return true
  }

  terminal.focus()
  terminal.dispatchEvent(
    typeof PointerEvent === "function"
      ? new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
      : new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
  )
  return true
}

/**
 * 创建打开审查文件的函数
 * @param input - 包含文件操作相关方法的配置对象
 * @returns 执行打开文件操作的函数
 */
export const createOpenReviewFile = (input: {
  showAllFiles: () => void
  tabForPath: (path: string) => string
  openTab: (tab: string) => void
  loadFile: (path: string) => any | Promise<void>
}) => {
  return (path: string) => {
    batch(() => {
      input.showAllFiles()
      const maybePromise = input.loadFile(path)
      const openTab = () => input.openTab(input.tabForPath(path))
      if (maybePromise instanceof Promise) maybePromise.then(openTab)
      else openTab()
    })
  }
}

/**
 * 创建打开会话文件标签页的函数
 * @param input - 包含标签页操作相关方法的配置对象
 * @returns 执行打开标签页操作的函数
 */
export const createOpenSessionFileTab = (input: {
  normalizeTab: (tab: string) => string
  openTab: (tab: string) => void
  pathFromTab: (tab: string) => string | undefined
  loadFile: (path: string) => void
  openReviewPanel: () => void
  setActive: (tab: string) => void
}) => {
  return (value: string) => {
    const next = input.normalizeTab(value)
    input.openTab(next)

    const path = input.pathFromTab(next)
    if (!path) return

    input.loadFile(path)
    input.openReviewPanel()
    input.setActive(next)
  }
}

/**
 * 计算标签页重新排序的目标索引
 * @param tabs - 当前标签页列表
 * @param from - 源标签页标识
 * @param to - 目标标签页标识
 * @returns 目标索引，未找到或无效则返回 undefined
 */
export const getTabReorderIndex = (tabs: readonly string[], from: string, to: string) => {
  const fromIndex = tabs.indexOf(from)
  const toIndex = tabs.indexOf(to)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return undefined
  return toIndex
}
