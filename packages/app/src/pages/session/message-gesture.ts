/**
 * 规范化滚轮增量值，根据不同的滚动模式转换为统一的像素值
 * @param input - 包含滚动增量信息的对象
 * @returns 规范化后的滚动增量值
 */
export const normalizeWheelDelta = (input: { deltaY: number; deltaMode: number; rootHeight: number }) => {
  if (input.deltaMode === 1) return input.deltaY * 40
  if (input.deltaMode === 2) return input.deltaY * input.rootHeight
  return input.deltaY
}

/**
 * 判断是否应该标记边界手势
 * @param input - 包含滚动位置和增量信息的对象
 * @returns 是否应该标记边界
 */
export const shouldMarkBoundaryGesture = (input: {
  delta: number
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}) => {
  const max = input.scrollHeight - input.clientHeight
  if (max <= 1) return true
  if (!input.delta) return false

  if (input.delta < 0) return input.scrollTop + input.delta <= 0

  const remaining = max - input.scrollTop
  return input.delta > remaining
}
