# Arcade expedition kit

Canonical original source/art for EMBER WATCH and KEYSTONE KEEP. Both are short,
finite joystick-and-two-button arcade shooters supporting solo and local co-op.

Rebuild:
```
node library/mechanics/expedition-kit/create-assets.mjs
node scripts/build-expedition-catalog.mjs
node scripts/verify-expedition-behavior.mjs
pnpm --filter @htn/harness exec node --import tsx ../../scripts/verify-expedition-runtime.ts
```

Rebuilding invalidates old catalog approval when content changes. Review new
screenshots and proof hashes before renewing `quality.json`; a browser probe
alone cannot approve a game. Test scripts operate entirely offline and make no
model requests. Original code and procedural pixel art; no commercial assets.

Contracts live in each pack's `api.md`. Keys are shared; health, shots, cooldowns
and combat scores belong to their human player. The 180-second clock, stages,
XP and terminal outcome are shared. Init resets all state and the private RNG.

Behavior tests cover twelve default full matches across three seeds, both modes,
independent/simultaneous controls, scoring, win/loss/reset, deterministic drawing,
revives, upgrades, persistent keys, locked exits and bounded maximum settings.
Browser replays establish four full default matches in the actual runtime with
score/event agreement and screenshots. Bots are deterministic test controllers;
these checks do not measure human enjoyment or competitive balance.
