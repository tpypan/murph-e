#!/usr/bin/env bash
# One command from a cold Mac mini to attract mode.
#   scripts/kiosk.sh          build, start the cabinet server, launch Chromium in kiosk mode
#   scripts/kiosk.sh --dev    same, but `next dev` and a normal window
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-prod}"
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}/"
LOG_DIR="${LOG_DIR:-$HOME/htn-arcade-logs}"
mkdir -p "$LOG_DIR"

# Keep the Mac awake while the cabinet runs (caffeinate dies with this script).
caffeinate -dimsu -w $$ &

if [ ! -f .env ]; then
  echo "missing .env (copy .env.example and add OPENAI_API_KEY)" >&2
  exit 1
fi

if [ "$MODE" = "--dev" ]; then
  pnpm dev > "$LOG_DIR/server.log" 2>&1 &
else
  pnpm --filter @htn/cabinet build
  pnpm --filter @htn/cabinet start -p "$PORT" > "$LOG_DIR/server.log" 2>&1 &
fi
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 120); do
  if curl -fs -o /dev/null "$URL"; then break; fi
  sleep 1
done

# Chromium flags: kiosk, no first-run UI, autoplay without a gesture (Web
# Audio in the game iframe), mic permission auto-accepted for our origin.
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="${PROFILE:-$HOME/.htn-arcade-chrome}"
FLAGS=(
  --user-data-dir="$PROFILE"
  --no-first-run --no-default-browser-check --disable-session-crashed-bubble
  --autoplay-policy=no-user-gesture-required
  --use-fake-ui-for-media-stream
  --disable-features=TranslateUI
  --overscroll-history-navigation=0
  --disable-pinch
)
if [ "$MODE" != "--dev" ]; then FLAGS+=(--kiosk); fi

"$CHROME" "${FLAGS[@]}" "$URL" > "$LOG_DIR/chrome.log" 2>&1
