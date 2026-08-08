/**
 * 提示词占位符输入参数
 */
type PromptPlaceholderInput = {
  mode: "normal" | "shell"
  commentCount: number
  example: string
  suggest: boolean
  t: (key: string, params?: Record<string, string>) => string
}

/**
 * 获取提示词占位符文本
 * @param input 占位符输入参数
 */
export function promptPlaceholder(input: PromptPlaceholderInput) {
  if (input.mode === "shell") return input.t("prompt.placeholder.shell", { example: input.example })
  if (input.commentCount > 1) return input.t("prompt.placeholder.summarizeComments")
  if (input.commentCount === 1) return input.t("prompt.placeholder.summarizeComment")
  if (!input.suggest) return input.t("prompt.placeholder.simple")
  return input.t("prompt.placeholder.normal", { example: input.example })
}

export function promptDesignPlaceholder(
  mode: PromptPlaceholderInput["mode"],
  placeholder: string,
  t: PromptPlaceholderInput["t"],
) {
  if (mode === "shell") return placeholder
  return t("ui.promptInput.placeholder.normal", { slash: "/", at: "@" })
}
