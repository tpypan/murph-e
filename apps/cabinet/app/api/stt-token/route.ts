import { MODELS, openai } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Mints a short-lived client secret for a realtime transcription session.
 * The kiosk page connects to OpenAI directly over WebRTC with it.
 */
export async function POST(): Promise<Response> {
  try {
    const secret = await openai().realtime.clientSecrets.create({
      expires_after: { anchor: 'created_at', seconds: 300 },
      session: {
        type: 'transcription',
        audio: {
          input: {
            transcription: { model: MODELS.sttLive, language: 'en' },
            noise_reduction: { type: 'near_field' },
            // gpt-live-transcribe streams continuously and rejects turn detection;
            // the client commits the buffer when TALK is released.
            turn_detection: null,
          },
        },
      },
    })
    return Response.json({
      value: secret.value,
      expiresAt: secret.expires_at,
      model: MODELS.sttLive,
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
