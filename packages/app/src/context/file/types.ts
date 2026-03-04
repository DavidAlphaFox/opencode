import type { FileContent } from "@opencode-ai/sdk/v2"

/**
 * 文件选择区域
 */
export type FileSelection = {
  startLine: number
  startChar: number
  endLine: number
  endChar: number
}

/**
 * 选中的行范围
 */
export type SelectedLineRange = {
  start: number
  end: number
  side?: "additions" | "deletions"
  endSide?: "additions" | "deletions"
}

/**
 * 文件视图状态（滚动位置、选中行等）
 */
export type FileViewState = {
  scrollTop?: number
  scrollLeft?: number
  selectedLines?: SelectedLineRange | null
}

/**
 * 文件状态（路径、名称、加载状态、内容等）
 */
export type FileState = {
  path: string
  name: string
  loaded?: boolean
  loading?: boolean
  error?: string
  content?: FileContent
}

/**
 * 从行范围转换为文件选择区域
 */
export function selectionFromLines(range: SelectedLineRange): FileSelection {
  const startLine = Math.min(range.start, range.end)
  const endLine = Math.max(range.start, range.end)
  return {
    startLine,
    endLine,
    startChar: 0,
    endChar: 0,
  }
}
