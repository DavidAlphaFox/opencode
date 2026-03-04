/**
 * 检查侧边栏是否展开
 * 移动端始终展开，否则根据展开状态决定
 */
export const sidebarExpanded = (mobile: boolean | undefined, opened: boolean) => !!mobile || opened
