/** Next may normalize req.url to localhost even when Chromium used 127.0.0.1. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const url = new URL(req.url)
  const host = req.headers.get('host')
  return origin === url.origin || (host !== null && origin === `${url.protocol}//${host}`)
}
