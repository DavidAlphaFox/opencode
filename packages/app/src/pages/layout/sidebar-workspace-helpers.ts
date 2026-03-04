/**
 * 获取工作区的展开状态
 * 优先使用显式设置，否则默认跟随本地工作区状态
 */
export const workspaceOpenState = (expanded: Record<string, boolean>, directory: string, local: boolean) =>
  expanded[directory] ?? local
