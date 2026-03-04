import { base64Decode } from "@opencode-ai/util/encode"

/**
 * 解码 base64 字符串
 * @param value - 要解码的 base64 字符串
 * @returns 解码后的字符串，解析失败返回 undefined
 */
export function decode64(value: string | undefined) {
  if (value === undefined) return
  try {
    return base64Decode(value)
  } catch {
    return
  }
}
