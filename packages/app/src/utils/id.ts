import z from "zod"

/**
 * ID 前缀映射
 */
const prefixes = {
  session: "ses",
  message: "msg",
  permission: "per",
  user: "usr",
  part: "prt",
  pty: "pty",
} as const

const LENGTH = 26
let lastTimestamp = 0
let counter = 0

/**
 * ID 前缀类型
 */
type Prefix = keyof typeof prefixes

/**
 * ID 生成器命名空间
 */
export namespace Identifier {
  /**
   * 创建 ID 验证模式
   * @param 前缀
   prefix ID * @returns Zod 验证模式
   */
  export function schema(prefix: Prefix) {
    return z.string().startsWith(prefixes[prefix])
  }

  /**
   * 生成升序 ID
   * @param prefix ID 前缀
   * @param given 可选的指定 ID
   * @returns 生成的 ID
   */
  export function ascending(prefix: Prefix, given?: string) {
    return generateID(prefix, false, given)
  }

  /**
   * 生成降序 ID
   * @param prefix ID 前缀
   * @param given 可选的指定 ID
   * @returns 生成的 ID
   */
  export function descending(prefix: Prefix, given?: string) {
    return generateID(prefix, true, given)
  }
}

/**
 * 生成 ID
 * @param prefix ID 前缀
 * @param descending 是否降序
 * @param given 可选的指定 ID
 * @returns 生成的 ID
 */
function generateID(prefix: Prefix, descending: boolean, given?: string): string {
  if (!given) {
    return create(prefix, descending)
  }

  if (!given.startsWith(prefixes[prefix])) {
    throw new Error(`ID ${given} does not start with ${prefixes[prefix]}`)
  }

  return given
}

/**
 * 创建 ID
 * @param prefix ID 前缀
 * @param descending 是否降序
 * @param timestamp 可选的时间戳
 * @returns 生成的 ID
 */
function create(prefix: Prefix, descending: boolean, timestamp?: number): string {
  const currentTimestamp = timestamp ?? Date.now()

  if (currentTimestamp !== lastTimestamp) {
    lastTimestamp = currentTimestamp
    counter = 0
  }

  counter += 1

  let now = BigInt(currentTimestamp) * BigInt(0x1000) + BigInt(counter)

  if (descending) {
    now = ~now
  }

  const timeBytes = new Uint8Array(6)
  for (let i = 0; i < 6; i += 1) {
    timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  }

  return prefixes[prefix] + "_" + bytesToHex(timeBytes) + randomBase62(LENGTH - 12)
}

/**
 * 将字节数组转换为十六进制字符串
 * @param bytes 字节数组
 * @returns 十六进制字符串
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

/**
 * 生成随机 Base62 字符串
 * @param length 字符串长度
 * @returns 随机字符串
 */
function randomBase62(length: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const bytes = getRandomBytes(length)
  let result = ""
  for (let i = 0; i < length; i += 1) {
    result += chars[bytes[i] % 62]
  }
  return result
}

/**
 * 获取随机字节数组
 * @param length 字节数组长度
 * @returns 随机字节数组
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes)
    return bytes
  }

  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }

  return bytes
}
