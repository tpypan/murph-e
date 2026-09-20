// Push-to-talk, local Whisper transcription. Capture only while held; send the
// finished clip to our own server on release. No cloud audio or live session.
export interface SttHandlers {
  onState: (state: 'live' | 'error', detail?: string) => void
  onStream?: (stream: MediaStream | null) => void
}

export class Stt {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private handlers: SttHandlers | null = null
  private session = 0
  private holding = false
  private request: AbortController | null = null

  private releaseMic(): void {
    this.stream?.getTracks().forEach((track) => {
      track.stop()
    })
    this.stream = null
    this.handlers?.onStream?.(null)
  }

  cancel(): void {
    this.session++
    this.holding = false
    this.request?.abort()
    this.request = null
    void this.stopRecorder()
    this.releaseMic()
    this.handlers = null
  }

  async start(handlers: SttHandlers): Promise<void> {
    this.cancel()
    const session = this.session
    this.holding = true
    this.handlers = handlers
    this.chunks = []
    const active = () => this.session === session && this.holding
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch {
      if (active()) handlers.onState('error', 'Allow microphone access, then hold Talk to retry.')
      return
    }
    if (!active()) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
      return
    }
    this.stream = stream
    try {
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      )
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      this.recorder = recorder
      const chunks = this.chunks
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => {
        if (!active()) return
        this.cancel()
        handlers.onState('error', 'Recording failed. Hold Talk to try again.')
      }
      recorder.start(250)
      handlers.onStream?.(stream)
      handlers.onState('live')
    } catch {
      this.cancel()
      handlers.onState('error', 'This browser could not record audio. Try Chrome.')
    }
  }

  async stop(): Promise<string> {
    const session = this.session
    this.holding = false
    const recorded = this.stopRecorder()
    this.releaseMic()
    const clip = await recorded
    if (this.session !== session || !clip?.size) return ''
    const request = new AbortController()
    this.request = request
    const timer = setTimeout(() => request.abort(), 100_000)
    try {
      const form = new FormData()
      form.append('audio', clip, clip.type.includes('mp4') ? 'clip.mp4' : 'clip.webm')
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: form,
        signal: request.signal,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Local transcription failed. Try again.')
      return this.session === session ? String(result.text ?? '').trim() : ''
    } catch (error) {
      if (this.session !== session) return ''
      if (request.signal.aborted)
        throw new Error('Transcription timed out. Try a shorter recording.')
      throw error
    } finally {
      clearTimeout(timer)
      if (this.request === request) this.request = null
    }
  }

  private stopRecorder(): Promise<Blob | null> {
    const recorder = this.recorder
    this.recorder = null
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    const chunks = this.chunks
    return new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
      recorder.stop()
    })
  }
}
