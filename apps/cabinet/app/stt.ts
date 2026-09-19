// Push-to-talk speech to text. Primary: a realtime transcription session over
// WebRTC (words appear while speaking). Fallback: a MediaRecorder clip posted
// to /api/stt on release. The mic stream and a client secret are pre-warmed
// so the handshake on TALK-down is a few hundred milliseconds.

export interface SttHandlers {
  onText: (committed: string, partial: string) => void
  onState: (state: 'connecting' | 'live' | 'closed' | 'error', detail?: string) => void
}

interface Token {
  value: string
  expiresAt: number
}

export class Stt {
  private stream: MediaStream | null = null
  private token: Token | null = null
  private tokenPromise: Promise<Token | null> | null = null
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private committed: string[] = []
  private partial = new Map<string, string>()
  private handlers: SttHandlers | null = null
  private itemOrder: string[] = []
  private pendingCompleted: (() => void) | null = null

  /** Ask for the mic once and keep it. Returns false if there is no mic. */
  async warmMic(): Promise<boolean> {
    if (this.stream) return true
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      return true
    } catch {
      return false
    }
  }

  hasMic(): boolean {
    return !!this.stream
  }

  /** Mint (or reuse) a client secret so TALK-down does not wait on the server. */
  warmToken(): Promise<Token | null> {
    const now = Date.now() / 1000
    if (this.token && this.token.expiresAt - now > 60) return Promise.resolve(this.token)
    if (this.tokenPromise) return this.tokenPromise
    this.tokenPromise = fetch('/api/stt-token', { method: 'POST' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok || !j.value) throw new Error(j.error ?? `stt-token ${r.status}`)
        this.token = { value: j.value, expiresAt: j.expiresAt }
        return this.token
      })
      .catch(() => null)
      .finally(() => {
        this.tokenPromise = null
      })
    return this.tokenPromise
  }

  /** TALK down. */
  async start(handlers: SttHandlers): Promise<void> {
    this.handlers = handlers
    this.committed = []
    this.partial.clear()
    this.itemOrder = []
    this.chunks = []
    if (!(await this.warmMic())) {
      handlers.onState('error', 'no microphone')
      return
    }
    const stream = this.stream!
    // Always record a clip in parallel: it is the fallback if realtime yields nothing.
    try {
      this.recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }
      this.recorder.start(250)
    } catch {
      this.recorder = null
    }
    handlers.onState('connecting')
    const token = await this.warmToken()
    if (!token) {
      handlers.onState('error', 'no token')
      return
    }
    try {
      const pc = new RTCPeerConnection()
      this.pc = pc
      for (const track of stream.getAudioTracks()) pc.addTrack(track, stream)
      const dc = pc.createDataChannel('oai-events')
      this.dc = dc
      dc.onmessage = (e) => this.onEvent(e.data)
      dc.onopen = () => handlers.onState('live')
      dc.onclose = () => handlers.onState('closed')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const res = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/sdp' },
      })
      if (!res.ok)
        throw new Error(`realtime/calls ${res.status}: ${(await res.text()).slice(0, 200)}`)
      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
      // A secret is single-use per session; mint the next one now.
      this.token = null
      void this.warmToken()
    } catch (e) {
      handlers.onState('error', e instanceof Error ? e.message : String(e))
      this.teardown()
    }
  }

  private onEvent(raw: string): void {
    let ev: {
      type: string
      item_id?: string
      delta?: string
      transcript?: string
      error?: { message?: string }
    }
    try {
      ev = JSON.parse(raw)
    } catch {
      return
    }
    if (ev.type === 'conversation.item.input_audio_transcription.delta' && ev.item_id) {
      if (!this.partial.has(ev.item_id)) this.itemOrder.push(ev.item_id)
      this.partial.set(ev.item_id, (this.partial.get(ev.item_id) ?? '') + (ev.delta ?? ''))
      this.emit()
    } else if (ev.type === 'conversation.item.input_audio_transcription.completed' && ev.item_id) {
      this.partial.delete(ev.item_id)
      if (ev.transcript?.trim()) this.committed.push(ev.transcript.trim())
      this.emit()
      this.pendingCompleted?.()
    } else if (ev.type === 'error') {
      this.handlers?.onState('error', ev.error?.message ?? 'realtime error')
    }
  }

  private emit(): void {
    const partial = this.itemOrder
      .map((id) => this.partial.get(id) ?? '')
      .join(' ')
      .trim()
    this.handlers?.onText(this.committed.join(' '), partial)
  }

  /** TALK up: flush the last segment, wait briefly for it, return the text. */
  async stop(): Promise<string> {
    const dc = this.dc
    if (dc && dc.readyState === 'open') {
      const hadPartial = this.partial.size > 0
      try {
        dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      } catch {}
      // Give the server up to 1.5 s to finish the final segment.
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, hadPartial ? 1500 : 700)
        this.pendingCompleted = () => {
          if (this.partial.size === 0) {
            clearTimeout(t)
            resolve()
          }
        }
      })
      this.pendingCompleted = null
    }
    let text = [this.committed.join(' '), ...this.itemOrder.map((id) => this.partial.get(id) ?? '')]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const clip = await this.stopRecorder()
    this.teardown()
    if (!text && clip && clip.size > 2000) {
      text = await this.transcribeClip(clip)
    }
    return text
  }

  private stopRecorder(): Promise<Blob | null> {
    const rec = this.recorder
    this.recorder = null
    if (!rec || rec.state === 'inactive') return Promise.resolve(null)
    return new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(this.chunks, { type: 'audio/webm' }))
      rec.stop()
    })
  }

  private async transcribeClip(clip: Blob): Promise<string> {
    try {
      const form = new FormData()
      form.append('audio', clip, 'clip.webm')
      const r = await fetch('/api/stt', { method: 'POST', body: form })
      const j = await r.json()
      return String(j.text ?? '').trim()
    } catch {
      return ''
    }
  }

  private teardown(): void {
    try {
      this.dc?.close()
    } catch {}
    try {
      this.pc?.close()
    } catch {}
    this.dc = null
    this.pc = null
  }
}
