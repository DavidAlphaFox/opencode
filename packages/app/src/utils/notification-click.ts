type WindowTarget = {
  focus: () => void
  location: {
    assign: (href: string) => void
  }
}

/**
 * 处理通知点击事件
 * 聚焦窗口并导航到指定链接
 */
export const handleNotificationClick = (href?: string, target: WindowTarget = window) => {
  target.focus()
  if (!href) return
  target.location.assign(href)
}
