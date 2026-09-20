# Recorded speech transcription

The experiment now uses the speech implementation from Tony's main commit
`14a6876` (`feat(cabinet): transcribe speech with the OpenAI API by default`).
Its adapter is `apps/cabinet/app/api/stt/openai-transcribe.ts`.

## Main's behavior

TALK records only while held. Release stops the microphone and uploads the
encoded recording to `/api/stt`. The server submits the original bytes to
OpenAI's audio transcription endpoint using `gpt-4o-mini-transcribe`, English
(`language: en`) and JSON output. No translation, rewriting or game-generation
call is added. The player reviews the transcript before MAKE GAME.

```dotenv
HTN_STT=openai
HTN_STT_MODEL=gpt-4o-mini-transcribe
```

These match main's defaults and are configured in this worktree's local `.env`.
`HTN_STT=local` explicitly selects the previous faster-whisper `tiny.en` worker;
that mode needs the local Python environment and downloaded model. For backwards
compatibility, `HTN_STT_PROVIDER` is accepted only when `HTN_STT` is unset.
`HTN_STT_MODEL` still permits an explicit model override.

## Branch safeguards retained during the port

- The route validates the recording's format and retains its bytes and MIME type.
- The 12 MiB limit, 60-second full-response deadline and request cancellation remain.
- Automatic retries are disabled; errors are sanitized and do not silently switch providers.
- The route enters the real-player app scope; the adapter requires that scope.
  Developer calls remain blocked even with a configured key.
- The options screen continues to show OpenAI or local speech accurately.
- API credentials stay server-side; this app does not save uploaded audio.

The former harness-owned `gpt-transcribe` implementation has been removed rather
than leaving two competing cloud transcription paths. The harness retains shared
input/error/provider utilities, while the cabinet owns main's transcription adapter.
The unrelated Next build-directory changes from main were not needed for this port.

## Verification

`packages/harness/test/transcribe.test.ts` tests the actual route and adapter with
mocked SDK transport: main's model/English/JSON parameters, audio bytes, model override,
WebM/WAV/MP4 metadata, provider alias precedence, size/type errors, cancellation,
timeouts and sanitized provider errors. No paid speech request is made.

Run `pnpm test:scores` and the harness/cabinet typechecks. The existing local
speech UI fixture intercepts `/api/stt` and runs the local worker; it cannot
accidentally test the configured cloud provider.

The experiment is served at port 3001. Fetching main did not modify the original
main checkout or its server at port 3000. Recognition quality on the user's actual
recordings has not been benchmarked as part of this port.
