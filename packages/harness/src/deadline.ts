export const REQUEST_LIMITS = { spec: 30_000, build: 300_000, remix: 60_000 } as const

/** Covers the full streamed response, not just opening the HTTP connection. */
export async function withDeadline<T>(
  stage: string,
  limitMs: number,
  parent: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  parent?.throwIfAborted()
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort = () => {}
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => {
      reject(parent?.reason ?? new DOMException('Cancelled', 'AbortError'))
      controller.abort(parent?.reason)
    }
    parent?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      const error = new Error(`${stage} exceeded its ${limitMs / 1000}s request deadline`)
      reject(error)
      controller.abort(error)
    }, limitMs)
  })
  try {
    return await Promise.race([run(controller.signal), interrupted])
  } finally {
    clearTimeout(timer)
    parent?.removeEventListener('abort', onAbort)
  }
}
