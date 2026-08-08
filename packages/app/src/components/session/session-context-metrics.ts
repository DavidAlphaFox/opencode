import type { AssistantMessage, Message } from "@opencode-ai/sdk/v2/client"

/**
 * AI 服务提供商
 */
type Provider = {
  id: string
  name?: string
  models: Record<string, Model | undefined>
}

/**
 * AI 模型
 */
type Model = {
  name?: string
  limit: {
    context: number
  }
}

/**
 * 上下文使用情况
 */
type Context = {
  message: AssistantMessage
  provider?: Provider
  model?: Model
  providerLabel: string
  modelLabel: string
  limit: number | undefined
  input: number
  total: number
  usage: number | null
}

/**
 * 计算消息的总 token 数
 * @param msg 助手消息
 */
const tokenTotal = (msg: AssistantMessage) => {
  return msg.tokens.input + msg.tokens.output + msg.tokens.reasoning + msg.tokens.cache.read + msg.tokens.cache.write
}

/**
 * 获取最后一个包含 token 的助手消息
 * @param messages 消息列表
 */
const lastAssistantWithTokens = (messages: Message[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== "assistant") continue
    if (tokenTotal(msg) <= 0) continue
    return msg
  }
}

/**
 * 构建会话上下文指标
 * @param messages 消息列表
 * @param providers 提供商列表
 */
const build = (messages: Message[] = [], providers: Provider[] = []): Context | undefined => {
  const message = lastAssistantWithTokens(messages)
  if (!message) return undefined

  const provider = providers.find((item) => item.id === message.providerID)
  const model = provider?.models[message.modelID]
  const limit = model?.limit.context
  const total = tokenTotal(message)

  return {
    message,
    provider,
    model,
    providerLabel: provider?.name ?? message.providerID,
    modelLabel: model?.name ?? message.modelID,
    limit,
    input: message.tokens.input,
    total,
    usage: limit ? Math.round((total / limit) * 100) : null,
  }
}

export function getSessionContext(messages: Message[] = [], providers: Provider[] = []) {
  return build(messages, providers)
}