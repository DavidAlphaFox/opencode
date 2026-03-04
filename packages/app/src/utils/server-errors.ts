/**
 * 配置无效错误
 */
export type ConfigInvalidError = {
  name: "ConfigInvalidError"
  data: {
    path?: string
    message?: string
    issues?: Array<{ message: string; path: string[] }>
  }
}

type Label = {
  unknown: string
  invalidConfiguration: string
}

const fallback: Label = {
  unknown: "Unknown error",
  invalidConfiguration: "Invalid configuration",
}

function resolveLabel(labels: Partial<Label> | undefined): Label {
  return {
    unknown: labels?.unknown ?? fallback.unknown,
    invalidConfiguration: labels?.invalidConfiguration ?? fallback.invalidConfiguration,
  }
}

/**
 * 格式化服务器错误为可读字符串
 * @param error 错误对象
 * @param labels 自定义标签
 * @returns 格式化的错误字符串
 */
export function formatServerError(error: unknown, labels?: Partial<Label>) {
  if (isConfigInvalidErrorLike(error)) return parseReabaleConfigInvalidError(error, labels)
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return resolveLabel(labels).unknown
}

/**
 * 检查是否为配置无效错误
 * @param error 要检查的值
 * @returns 是否为 ConfigInvalidError
 */
function isConfigInvalidErrorLike(error: unknown): error is ConfigInvalidError {
  if (typeof error !== "object" || error === null) return false
  const o = error as Record<string, unknown>
  return o.name === "ConfigInvalidError" && typeof o.data === "object" && o.data !== null
}

/**
 * 解析 Reabale 配置无效错误
 * @param errorInput 错误输入
 * @param labels 自定义标签
 * @returns 格式化的错误信息
 */
export function parseReabaleConfigInvalidError(errorInput: ConfigInvalidError, labels?: Partial<Label>) {
  const head = resolveLabel(labels).invalidConfiguration
  const file = errorInput.data.path && errorInput.data.path !== "config" ? errorInput.data.path : ""
  const detail = errorInput.data.message?.trim() ?? ""
  const issues = (errorInput.data.issues ?? []).map((issue) => {
    return `${issue.path.join(".")}: ${issue.message}`
  })
  if (issues.length) return [head, file, "", ...issues].filter(Boolean).join("\n")
  return [head, file, detail].filter(Boolean).join("\n")
}
