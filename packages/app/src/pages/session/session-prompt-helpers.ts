/**
 * 生成问题数量的副标题文本
 * @param count - 问题数量
 * @param t - 翻译函数
 * @returns 格式化的问题数量文本，数量为0时返回空字符串
 */
export const questionSubtitle = (count: number, t: (key: string) => string) => {
  if (count === 0) return ""
  return `${count} ${t(count > 1 ? "ui.common.question.other" : "ui.common.question.one")}`
}
