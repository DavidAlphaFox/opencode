/**
 * 比较两个数组是否相等
 * @param a 第一个数组
 * @param b 第二个数组
 * @returns 两个数组是否相等
 */
export function same<T>(a: readonly T[] | undefined, b: readonly T[] | undefined) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((x, i) => x === b[i])
}
