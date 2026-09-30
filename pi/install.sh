#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "$USER" != arcade || "$repo" != /home/arcade/murph-e ]]; then
  echo 'Run as arcade from /home/arcade/murph-e.' >&2
  exit 1
fi
if [[ ! -f "$repo/pnpm-lock.yaml" ]]; then
  echo 'pnpm-lock.yaml is missing.' >&2
  exit 1
fi

export PATH="$HOME/.local/opt/node-v24/bin:$PATH"
cd "$repo"
corepack enable --install-directory "$HOME/.local/opt/node-v24/bin"
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @htn/cabinet build

mkdir -p "$HOME/.config/systemd/user" "$HOME/.config/labwc" "$HOME/.local/bin"
for target in "$HOME/.config/systemd/user/murph-e.service" "$HOME/.local/bin/murph-e-kiosk"; do
  if [[ -f "$target" && ! -e "$target.previous" ]]; then cp -p "$target" "$target.previous"; fi
done
install -m 644 "$repo/pi/murph-e.service" "$HOME/.config/systemd/user/murph-e.service"
install -m 755 "$repo/pi/murph-e-kiosk" "$HOME/.local/bin/murph-e-kiosk"

autostart="$HOME/.config/labwc/autostart"
launch='$HOME/.local/bin/murph-e-kiosk &'
touch "$autostart"
if ! grep -Fqx "$launch" "$autostart"; then
  printf '\n%s\n' "$launch" >> "$autostart"
fi

systemctl --user daemon-reload
systemctl --user enable murph-e.service
systemctl --user restart murph-e.service
echo 'Pi arcade installed. Reopen Chromium or log in again to load the new kiosk page.'
