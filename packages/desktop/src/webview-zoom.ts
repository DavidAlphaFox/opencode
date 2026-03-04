// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

import { invoke } from "@tauri-apps/api/core"
import { type as ostype } from "@tauri-apps/plugin-os"
import { createSignal } from "solid-js"

/** 当前操作系统类型 */
const OS_NAME = ostype()

/** 当前缩放级别的响应式状态 */
const [webviewZoom, setWebviewZoom] = createSignal(1)

/** 缩放级别的最大值 */
const MAX_ZOOM_LEVEL = 10
/** 缩放级别的最小值 */
const MIN_ZOOM_LEVEL = 0.2

/** 将缩放值限制在允许的范围内 */
const clamp = (value: number) => Math.min(Math.max(value, MIN_ZOOM_LEVEL), MAX_ZOOM_LEVEL)

/** 应用新的缩放级别并更新状态 */
const applyZoom = (next: number) => {
  setWebviewZoom(next)
  invoke("plugin:webview|set_webview_zoom", {
    value: next,
  })
}

window.addEventListener("keydown", (event) => {
  if (!(OS_NAME === "macos" ? event.metaKey : event.ctrlKey)) return

  let newZoom = webviewZoom()

  if (event.key === "-") newZoom -= 0.2
  if (event.key === "=" || event.key === "+") newZoom += 0.2
  if (event.key === "0") newZoom = 1

  applyZoom(clamp(newZoom))
})

export { webviewZoom }
