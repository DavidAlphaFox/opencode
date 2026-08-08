/**
 * AI 代理模型标识
 */
type AgentModel = {
  providerID: string
  modelID: string
}

/**
 * AI 代理配置
 */
type Agent = {
  model?: AgentModel
  variant?: string
}

/**
 * 可用模型配置
 */
type Model = AgentModel & {
  variants?: Record<string, unknown>
}

/**
 * 模型变体输入参数
 */
type VariantInput = {
  variants: string[]
  selected: string | null | undefined
  configured: string | undefined
}

/**
 * 获取已配置的代理模型变体
 * 检查代理配置的变体是否在模型可用变体列表中
 */
export function getConfiguredAgentVariant(input: { agent: Agent | undefined; model: Model | undefined }) {
  if (!input.agent?.variant) return undefined
  if (!input.agent.model) return undefined
  if (!input.model?.variants) return undefined
  if (input.agent.model.providerID !== input.model.providerID) return undefined
  if (input.agent.model.modelID !== input.model.modelID) return undefined
  if (!(input.agent.variant in input.model.variants)) return undefined
  return input.agent.variant
}

/**
 * 解析模型变体
 * 优先使用用户选择的变体，其次使用配置的变体
 */
export function resolveModelVariant(input: VariantInput) {
  if (input.selected === null) return undefined
  if (input.selected && input.variants.includes(input.selected)) return input.selected
  if (input.configured && input.variants.includes(input.configured)) return input.configured
  return undefined
}

/**
 * 循环切换到下一个模型变体
 * 如果当前是最后一个变体，则循环到第一个
 */
export function cycleModelVariant(input: VariantInput) {
  if (input.variants.length === 0) return undefined
  if (input.selected === null) return input.variants[0]
  if (input.selected && input.variants.includes(input.selected)) {
    const index = input.variants.indexOf(input.selected)
    if (index === input.variants.length - 1) return undefined
    return input.variants[index + 1]
  }
  if (input.configured && input.variants.includes(input.configured)) {
    const index = input.variants.indexOf(input.configured)
    if (index === input.variants.length - 1) return input.variants[0]
    return input.variants[index + 1]
  }
  return input.variants[0]
}
