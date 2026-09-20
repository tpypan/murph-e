# Compose mechanics without erasing the idea

Evidence: [Meta Arcade](https://openreview.net/pdf?id=6Tw0QPDyXML) explores arcade tasks assembled from configurable shared elements. It is an RL research environment, not a production-ready replacement for this cabinet.

Proposed application:

- Describe a game as movement + primary action + hazard behavior + reward rule + layout + pacing. Reuse their tested implementations while allowing distinctive combinations and small custom hooks.
- Make parameter ranges and compatibility rules explicit. A cosmetic reskin does not satisfy a requested new mechanic.
- Keep character identity independent from collision logic. Keep difficulty parameters separate from art and source references.
- When a requested behavior is outside the component catalogue, identify the missing capability before code generation. Use a bounded custom implementation and focused checks, or report the limitation.

Checks: remove the title/art and verify that the requested mechanic remains observable; inspect incompatible combinations; test the custom hook. Configurability is evidence of reuse potential, not proof that arbitrary combinations are playable or interesting.
