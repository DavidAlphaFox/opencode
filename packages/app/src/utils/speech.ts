import { onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { getSpeechRecognitionCtor } from "@/utils/runtime-adapters"

// Minimal types to avoid relying on non-standard DOM typings
/**
 * 识别结果类型
 */
type RecognitionResult = {
  0: { transcript: string }
  isFinal: boolean
}

/**
 * 识别事件类型
 */
type RecognitionEvent = {
  results: RecognitionResult[]
  resultIndex: number
}

/**
 * 语音识别接口
 */
interface Recognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

const COMMIT_DELAY = 250

/**
 * 追加文本片段
 * @param base 基础文本
 * @param addition 要添加的文本
 * @returns 合并后的文本
 */
const appendSegment = (base: string, addition: string) => {
  const trimmed = addition.trim()
  if (!trimmed) return base
  if (!base) return trimmed
  const needsSpace = /\S$/.test(base) && !/^[,.;!?]/.test(trimmed)
  return `${base}${needsSpace ? " " : ""}${trimmed}`
}

/**
 * 从假设文本中提取相对于已提交文本的后缀
 * @param committed 已提交的文本
 * @param hypothesis 假设文本
 * @returns 提取的后缀
 */
const extractSuffix = (committed: string, hypothesis: string) => {
  const cleanHypothesis = hypothesis.trim()
  if (!cleanHypothesis) return ""
  const baseTokens = committed.trim() ? committed.trim().split(/\s+/) : []
  const hypothesisTokens = cleanHypothesis.split(/\s+/)
  let index = 0
  while (
    index < baseTokens.length &&
    index < hypothesisTokens.length &&
    baseTokens[index] === hypothesisTokens[index]
  ) {
    index += 1
  }
  if (index < baseTokens.length) return ""
  return hypothesisTokens.slice(index).join(" ")
}

/**
 * 创建语音识别实例
 * @param lang 识别语言
 * @param onFinal 识别完成回调
 * @param onInterim 临时结果回调
 * @returns 语音识别控制接口
 */
export function createSpeechRecognition(opts?: {
  lang?: string
  onFinal?: (text: string) => void
  onInterim?: (text: string) => void
}) {
  const ctor = getSpeechRecognitionCtor<Recognition>(typeof window === "undefined" ? undefined : window)
  const hasSupport = Boolean(ctor)

  const [store, setStore] = createStore({
    isRecording: false,
    committed: "",
    interim: "",
  })

  const isRecording = () => store.isRecording
  const committed = () => store.committed
  const interim = () => store.interim

  let recognition: Recognition | undefined
  let shouldContinue = false
  let committedText = ""
  let sessionCommitted = ""
  let pendingHypothesis = ""
  let lastInterimSuffix = ""
  let shrinkCandidate: string | undefined
  let commitTimer: number | undefined
  let restartTimer: number | undefined

  const cancelPendingCommit = () => {
    if (commitTimer === undefined) return
    clearTimeout(commitTimer)
    commitTimer = undefined
  }

  const clearRestart = () => {
    if (restartTimer === undefined) return
    window.clearTimeout(restartTimer)
    restartTimer = undefined
  }

  const scheduleRestart = () => {
    clearRestart()
    if (!shouldContinue) return
    if (!recognition) return
    restartTimer = window.setTimeout(() => {
      restartTimer = undefined
      if (!shouldContinue) return
      if (!recognition) return
      try {
        recognition.start()
      } catch {}
    }, 150)
  }

  const commitSegment = (segment: string) => {
    const nextCommitted = appendSegment(committedText, segment)
    if (nextCommitted === committedText) return
    committedText = nextCommitted
    setStore("committed", committedText)
    if (opts?.onFinal) opts.onFinal(segment.trim())
  }

  const promotePending = () => {
    if (!pendingHypothesis) return
    const suffix = extractSuffix(sessionCommitted, pendingHypothesis)
    if (!suffix) {
      pendingHypothesis = ""
      return
    }
    sessionCommitted = appendSegment(sessionCommitted, suffix)
    commitSegment(suffix)
    pendingHypothesis = ""
    lastInterimSuffix = ""
    shrinkCandidate = undefined
    setStore("interim", "")
    if (opts?.onInterim) opts.onInterim("")
  }

  const applyInterim = (suffix: string, hypothesis: string) => {
    cancelPendingCommit()
    pendingHypothesis = hypothesis
    lastInterimSuffix = suffix
    shrinkCandidate = undefined
    setStore("interim", suffix)
    if (opts?.onInterim) {
      opts.onInterim(suffix ? appendSegment(committedText, suffix) : "")
    }
    if (!suffix) return
    const snapshot = hypothesis
    commitTimer = window.setTimeout(() => {
      if (pendingHypothesis !== snapshot) return
      const currentSuffix = extractSuffix(sessionCommitted, pendingHypothesis)
      if (!currentSuffix) return
      sessionCommitted = appendSegment(sessionCommitted, currentSuffix)
      commitSegment(currentSuffix)
      pendingHypothesis = ""
      lastInterimSuffix = ""
      shrinkCandidate = undefined
      setStore("interim", "")
      if (opts?.onInterim) opts.onInterim("")
    }, COMMIT_DELAY)
  }

  if (ctor) {
    recognition = new ctor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = opts?.lang || (typeof navigator !== "undefined" ? navigator.language : "en-US")

    recognition.onresult = (event: RecognitionEvent) => {
      if (!event.results.length) return

      let aggregatedFinal = ""
      let latestHypothesis = ""

      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = (result[0]?.transcript || "").trim()
        if (!transcript) continue
        if (result.isFinal) {
          aggregatedFinal = appendSegment(aggregatedFinal, transcript)
        } else {
          latestHypothesis = transcript
        }
      }

      if (aggregatedFinal) {
        cancelPendingCommit()
        const finalSuffix = extractSuffix(sessionCommitted, aggregatedFinal)
        if (finalSuffix) {
          sessionCommitted = appendSegment(sessionCommitted, finalSuffix)
          commitSegment(finalSuffix)
        }
        pendingHypothesis = ""
        lastInterimSuffix = ""
        shrinkCandidate = undefined
        setStore("interim", "")
        if (opts?.onInterim) opts.onInterim("")
        return
      }

      cancelPendingCommit()

      if (!latestHypothesis) {
        shrinkCandidate = undefined
        applyInterim("", "")
        return
      }

      const suffix = extractSuffix(sessionCommitted, latestHypothesis)

      if (!suffix) {
        if (!lastInterimSuffix) {
          shrinkCandidate = undefined
          applyInterim("", latestHypothesis)
          return
        }
        if (shrinkCandidate === "") {
          applyInterim("", latestHypothesis)
          return
        }
        shrinkCandidate = ""
        pendingHypothesis = latestHypothesis
        return
      }

      if (lastInterimSuffix && suffix.length < lastInterimSuffix.length) {
        if (shrinkCandidate === suffix) {
          applyInterim(suffix, latestHypothesis)
          return
        }
        shrinkCandidate = suffix
        pendingHypothesis = latestHypothesis
        return
      }

      shrinkCandidate = undefined
      applyInterim(suffix, latestHypothesis)
    }

    recognition.onerror = (e: { error: string }) => {
      clearRestart()
      cancelPendingCommit()
      lastInterimSuffix = ""
      shrinkCandidate = undefined
      if (e.error === "no-speech" && shouldContinue) {
        setStore("interim", "")
        if (opts?.onInterim) opts.onInterim("")
        scheduleRestart()
        return
      }
      shouldContinue = false
      setStore("isRecording", false)
    }

    recognition.onstart = () => {
      clearRestart()
      sessionCommitted = ""
      pendingHypothesis = ""
      cancelPendingCommit()
      lastInterimSuffix = ""
      shrinkCandidate = undefined
      setStore("interim", "")
      if (opts?.onInterim) opts.onInterim("")
      setStore("isRecording", true)
    }

    recognition.onend = () => {
      clearRestart()
      cancelPendingCommit()
      lastInterimSuffix = ""
      shrinkCandidate = undefined
      setStore("isRecording", false)
      if (shouldContinue) {
        scheduleRestart()
      }
    }
  }

  const start = () => {
    if (!recognition) return
    clearRestart()
    shouldContinue = true
    sessionCommitted = ""
    pendingHypothesis = ""
    cancelPendingCommit()
    lastInterimSuffix = ""
    shrinkCandidate = undefined
    setStore("interim", "")
    try {
      recognition.start()
    } catch {}
  }

  const stop = () => {
    if (!recognition) return
    shouldContinue = false
    clearRestart()
    promotePending()
    cancelPendingCommit()
    lastInterimSuffix = ""
    shrinkCandidate = undefined
    setStore("interim", "")
    if (opts?.onInterim) opts.onInterim("")
    try {
      recognition.stop()
    } catch {}
  }

  onCleanup(() => {
    shouldContinue = false
    clearRestart()
    promotePending()
    cancelPendingCommit()
    lastInterimSuffix = ""
    shrinkCandidate = undefined
    setStore("interim", "")
    if (opts?.onInterim) opts.onInterim("")
    try {
      recognition?.stop()
    } catch {}
  })

  return {
    isSupported: () => hasSupport,
    isRecording,
    committed,
    interim,
    start,
    stop,
  }
}
