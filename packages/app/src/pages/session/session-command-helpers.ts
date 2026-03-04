/**
 * 检查是否可以添加选择上下文
 * @param input - 包含活动标签和选择行信息的对象
 * @returns 是否可以添加选择上下文
 */
export const canAddSelectionContext = (input: {
  active?: string
  pathFromTab: (tab: string) => string | undefined
  selectedLines: (path: string) => unknown
}) => {
  if (!input.active) return false
  const path = input.pathFromTab(input.active)
  if (!path) return false
  return input.selectedLines(path) != null
}
