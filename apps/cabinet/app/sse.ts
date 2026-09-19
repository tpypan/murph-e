/** Read a fetch() SSE body and call onEvent for each `data:` JSON line. */
export async function readSse<T>(
  res: Response,
  onEvent: (ev: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.ok || !res.body) throw new Error(`generate failed: ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel()
      return
    }
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx = buffer.indexOf('\n\n')
    while (idx >= 0) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(line.slice(6)) as T)
          } catch {}
        }
      }
      idx = buffer.indexOf('\n\n')
    }
  }
}
