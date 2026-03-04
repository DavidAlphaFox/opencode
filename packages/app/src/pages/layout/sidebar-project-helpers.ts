/**
 * 检查项目是否被选中
 * 当前目录匹配工作区或属于沙箱时返回true
 */
export const projectSelected = (currentDir: string, worktree: string, sandboxes?: string[]) =>
  worktree === currentDir || sandboxes?.includes(currentDir) === true

/**
 * 检查项目磁贴是否处于激活状态
 * 菜单打开、预览模式、叠加层悬停时激活
 */
export const projectTileActive = (args: {
  menu: boolean
  preview: boolean
  open: boolean
  overlay: boolean
  hoverProject?: string
  worktree: string
}) => args.menu || (args.preview ? args.open : args.overlay && args.hoverProject === args.worktree)
