import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'

interface Transcript {
  text: string
  ms: number
  model: 'tiny.en'
  local: true
}

function repoRoot(): string {
  let dir = process.cwd()
  while (!existsSync(join(dir, 'scripts/whisper-worker.py'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('Cannot find the local Whisper worker.')
    dir = parent
  }
  return dir
}

class LocalWhisper {
  private child: ChildProcessWithoutNullStreams
  private ready: Promise<void>
  private nextId = 0
  private alive = true
  private pending = new Map<
    number,
    {
      resolve: (result: Transcript) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  constructor() {
    const root = repoRoot()
    const python = join(root, '.venv-stt/bin/python')
    if (!existsSync(python) || !existsSync(join(root, '.models/whisper-tiny.en/model.bin'))) {
      throw new Error(
        'Local speech recognition is not installed. Run pnpm stt:setup in the repository.',
      )
    }
    this.child = spawn(python, ['-u', join(root, 'scripts/whisper-worker.py')], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HF_HUB_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false' },
    })
    this.ready = new Promise<void>((resolve, reject) => {
      const startup = setTimeout(() => {
        this.child.kill()
        reject(new Error('Local speech recognition took too long to start.'))
      }, 60_000)
      const fail = (error: Error) => {
        this.alive = false
        clearTimeout(startup)
        reject(error)
        for (const request of this.pending.values()) {
          clearTimeout(request.timer)
          request.reject(error)
        }
        this.pending.clear()
      }
      this.child.on('error', fail)
      this.child.stdin.on('error', fail)
      this.child.on('exit', () => fail(new Error('Local speech recognition stopped. Try again.')))
      // Drain library diagnostics without mixing them into the JSON protocol.
      this.child.stderr.on('data', () => {})
      createInterface({ input: this.child.stdout }).on('line', (line) => {
        let result: Transcript & { ready?: boolean; id?: number; error?: string }
        try {
          result = JSON.parse(line)
        } catch {
          return
        }
        if (result.ready) {
          clearTimeout(startup)
          resolve()
          return
        }
        if (result.id === undefined) return
        const request = this.pending.get(result.id)
        if (!request) return
        clearTimeout(request.timer)
        this.pending.delete(result.id)
        if (result.error) request.reject(new Error(result.error))
        else request.resolve(result)
      })
    })
    // Closing the parent stdin on dev-server shutdown lets Python exit normally.
  }

  isAlive(): boolean {
    return this.alive
  }

  async transcribe(audio: Buffer): Promise<Transcript> {
    await this.ready
    if (!this.alive) throw new Error('Local speech recognition stopped. Try again.')
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        this.child.kill()
        reject(new Error('Transcription timed out. Try a shorter recording.'))
      }, 90_000)
      this.pending.set(id, { resolve, reject, timer })
      this.child.stdin.write(
        `${JSON.stringify({ id, audio: audio.toString('base64') })}\n`,
        (error) => {
          if (!error) return
          clearTimeout(timer)
          this.pending.delete(id)
          reject(error)
        },
      )
    })
  }
}

// Keep one model loaded across requests and Next.js development hot reloads.
const shared = globalThis as typeof globalThis & { htnWhisper?: LocalWhisper }

export async function transcribeLocally(audio: Buffer): Promise<Transcript> {
  if (!shared.htnWhisper?.isAlive()) shared.htnWhisper = new LocalWhisper()
  return shared.htnWhisper.transcribe(audio)
}
