type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => {
  return typeof value === "object" && value !== null
}

/**
 * 检查值是否为可释放对象
 * @param value 要检查的值
 * @returns 是否为具有 dispose 方法的对象
 */
export const isDisposable = (value: unknown): value is { dispose: () => void } => {
  return isRecord(value) && typeof value.dispose === "function"
}

/**
 * 如果值可释放则调用其 dispose 方法
 * @param value 要释放的值
 */
export const disposeIfDisposable = (value: unknown) => {
  if (!isDisposable(value)) return
  value.dispose()
}

/**
 * 检查值是否支持 setOption 方法
 * @param value 要检查的值
 * @returns 是否为具有 setOption 方法的对象
 */
export const hasSetOption = (value: unknown): value is { setOption: (key: string, next: unknown) => void } => {
  return isRecord(value) && typeof value.setOption === "function"
}

/**
 * 如果值支持 setOption 则调用它
 * @param value 目标对象
 * @param key 选项键名
 * @param next 新值
 */
export const setOptionIfSupported = (value: unknown, key: string, next: unknown) => {
  if (!hasSetOption(value)) return
  value.setOption(key, next)
}

/**
 * 获取当前悬停链接的文本
 * @param value 包含 hover 信息的对象
 * @returns 悬停链接的文本或 undefined
 */
export const getHoveredLinkText = (value: unknown) => {
  if (!isRecord(value)) return
  const link = value.currentHoveredLink
  if (!isRecord(link)) return
  if (typeof link.text !== "string") return
  return link.text
}

/**
 * 获取语音识别构造函数
 * @param value 包含 webkitSpeechRecognition 或 SpeechRecognition 的对象
 * @returns 语音识别构造函数或 undefined
 */
export const getSpeechRecognitionCtor = <T>(value: unknown): (new () => T) | undefined => {
  if (!isRecord(value)) return
  const ctor =
    typeof value.webkitSpeechRecognition === "function" ? value.webkitSpeechRecognition : value.SpeechRecognition
  if (typeof ctor !== "function") return
  return ctor as new () => T
}
