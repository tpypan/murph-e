'use client'

import { useEffect, useRef } from 'react'

export type VoiceStage = 'ready' | 'connecting' | 'recording' | 'finishing' | 'review'

/** Uses only the push-to-talk stream. Never opens or plays the microphone. */
export function PixelMeter({
  stream = null,
  working = false,
}: {
  stream?: MediaStream | null
  working?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    let audio: AudioContext | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let analyser: AnalyserNode | null = null
    let raf = 0
    const samples = new Uint8Array(1024)
    const bands = new Uint8Array(512)
    const peaks = new Float32Array(25)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (stream) {
      try {
        audio = new AudioContext()
        analyser = audio.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.5
        source = audio.createMediaStreamSource(stream)
        source.connect(analyser)
        void audio.resume().catch(() => {})
      } catch {
        /* Capture remains usable without the visualizer. */
      }
    }
    const draw = (now: number) => {
      let volume = 0
      if (analyser) {
        analyser.getByteTimeDomainData(samples)
        analyser.getByteFrequencyData(bands)
        volume = Math.min(
          1,
          Math.max(
            0,
            Math.sqrt(
              samples.reduce((sum, s) => sum + ((s - 128) / 128) ** 2, 0) / samples.length,
            ) - 0.008,
          ) * 9,
        )
      }
      ctx.clearRect(0, 0, 160, 40)
      ctx.fillStyle = working ? '#55ffff' : stream ? '#55ff55' : '#aaaaaa'
      for (let i = 0; i < 25; i++) {
        // Spread speech frequencies across a tapered, centered pixel waveform.
        const frequency = 100 * 40 ** (i / 24)
        const bin = Math.min(511, Math.round((frequency * 1024) / (audio?.sampleRate ?? 48000)))
        const contour = 0.2 + 0.8 * Math.sin((Math.PI * i) / 24) ** 0.7
        const target = volume * contour * (0.4 + 0.6 * Math.sqrt(bands[bin]! / 255))
        peaks[i] += (target - peaks[i]!) * (target > peaks[i]! ? 0.65 : 0.16)
        const radius = working
          ? reduced
            ? 1
            : Math.round(contour * (1 + Math.sin(i * 0.5 - now / 220)) * 1.5)
          : Math.round(peaks[i]! * 4)
        for (let row = -radius; row <= radius; row++) {
          ctx.fillRect(6 + i * 6, 18 + row * 4, 4, 3)
        }
      }
      if (stream || working) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      source?.disconnect()
      analyser?.disconnect()
      if (audio && audio.state !== 'closed') void audio.close().catch(() => {})
    }
  }, [stream, working])
  return (
    <canvas
      className="pixel-meter"
      ref={canvas}
      width={160}
      height={40}
      tabIndex={-1}
      aria-hidden="true"
    />
  )
}

export function TalkButton({
  onTalk,
  children = '> HOLD TO TALK',
}: {
  onTalk: (down: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="primary talk-button"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        onTalk(true)
      }}
      onPointerUp={() => onTalk(false)}
      onPointerCancel={() => onTalk(false)}
      onLostPointerCapture={() => onTalk(false)}
      onKeyDown={(e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return
        e.preventDefault()
        e.stopPropagation()
        if (!e.repeat) onTalk(true)
      }}
      onKeyUp={(e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return
        e.preventDefault()
        e.stopPropagation()
        onTalk(false)
      }}
      onBlur={() => onTalk(false)}
    >
      {children}
    </button>
  )
}

export function VoiceInput({
  stage,
  stream,
  transcript,
  error,
  onTalk,
  onCreate,
  onCancel,
  page = 0,
  onPage,
}: {
  stage: VoiceStage
  stream: MediaStream | null
  transcript: string
  error: string | null
  onTalk: (down: boolean) => void
  onCreate: () => void
  onCancel: () => void
  page?: number
  onPage: () => void
}) {
  const finish = useRef(onTalk)
  finish.current = onTalk
  useEffect(() => {
    if (stage !== 'recording') return
    const timer = setTimeout(() => finish.current(false), 30_000)
    return () => clearTimeout(timer)
  }, [stage])
  const heading = {
    ready: 'DESCRIBE YOUR GAME',
    connecting: 'DESCRIBE YOUR GAME',
    recording: 'LISTENING',
    finishing: 'ONE MOMENT',
    review: 'YOU SAID',
  }[stage]
  const hint = {
    ready: '',
    connecting: '',
    recording: 'RELEASE WHEN DONE',
    finishing: 'READING YOUR VOICE...',
    review: '',
  }[stage]
  const pages = textPages(transcript)
  return (
    <section className="stage voice-stage" aria-label="Describe your game">
      <h1 aria-live="polite" className={stage === 'recording' ? 'green' : ''}>
        {heading}
      </h1>
      {hint && <p>{hint}</p>}
      {stage === 'review' ? (
        <blockquote className="voice-transcript">
          {pages[page % pages.length]}
          {pages.length > 1 && (
            <button type="button" className="support" onClick={onPage}>
              MORE · {(page % pages.length) + 1}/{pages.length}
            </button>
          )}
        </blockquote>
      ) : (
        <PixelMeter stream={stream} working={stage === 'finishing' || stage === 'connecting'} />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <TalkButton onTalk={onTalk}>
          {stage === 'recording' || stage === 'connecting'
            ? 'RELEASE TO FINISH'
            : stage === 'review'
              ? 'HOLD TO RETRY'
              : stage === 'finishing'
                ? 'MIC OFF'
                : '> HOLD TO TALK'}
        </TalkButton>
        {stage === 'review' && (
          <button type="button" className="primary" onClick={onCreate}>
            &gt; MAKE GAME
          </button>
        )}
        {stage === 'recording' && (
          <button type="button" onClick={() => onTalk(false)}>
            DONE
          </button>
        )}
        <button type="button" className="back" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </section>
  )
}

/** Paginate at word boundaries so long ideas fit without scrolling. */
export function textPages(text: string, limit = 108): string[] {
  const pages: string[] = []
  let page = ''
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > limit) {
      pages.push(page)
      page = ''
    }
    page += `${page ? ' ' : ''}${word}`
  }
  if (page) pages.push(page)
  return pages.length ? pages : ['']
}
