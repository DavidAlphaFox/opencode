import type { Project, ProviderListResponse } from "@opencode-ai/sdk/v2/client"

/**
 * 字符串比较函数
 */
export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * 规范化提供商列表，移除已弃用的模型
 */
export function normalizeProviderList(input: ProviderListResponse): ProviderListResponse {
  return {
    ...input,
    all: input.all.map((provider) => ({
      ...provider,
      models: Object.fromEntries(Object.entries(provider.models).filter(([, info]) => info.status !== "deprecated")),
    })),
  }
}

/**
 * 清理项目信息，移除敏感的图标URL
 */
export function sanitizeProject(project: Project) {
  if (!project.icon?.url && !project.icon?.override) return project
  return {
    ...project,
    icon: {
      ...project.icon,
      url: undefined,
      override: undefined,
    },
  }
}
