# Spider-Man source fighter admission — 2026-09-19

The private `spider-man-reference/spider-man` actor is source-checked and complete for the documented fighter1.3 adapter:16 character clips plus3 actual source web-effect clips,84 retained exact-color frames. The private `spider-man-fighter-reference` game adapter is verified. It uses the real `ART.get('spider-man-reference/spider-man').character()` helper and the unchanged public fighter controller. This is an authored adaptation with source art, not original Marvel vs.Capcom gameplay or a human balance certification.

## What was reviewed

The actual source pose contact and current native runtime views were inspected. The low stance and compact step sequence are recognizable. The straight punch and extended standing/air kicks meet opponents at authored attack windows. Raised-arm and low protective poses serve as standing/crouching guard; their original state labels remain unverified. Four observed airborne poses form an authored jump sequence; its order is not claimed as recovered ROM animation. Source139/140/142/143 form the visible salute/thumbs-up victory adaptation. Reaction479/480 and fall514–522 replace the old recoil/KO proxies; the final grounded pose is held. Previously imported unused proxy frames remain preserved as provenance, not used by the current reaction clips.

No source recolor or substitute art was needed. The orange/red highlight ramp is present in the original sheet and is retained. Exact RGB preservation applies after explicitly authored nearest9/16 scaling and mirroring. Pixels, palettes, layers, selected anchors and animation geometry were preserved while obsolete draft/proxy/generic-projectile descriptions were corrected in stored metadata. Original source bytes and previous frozen import revisions remain unchanged.

## Native and mechanical evidence

- All84 retained frames rendered in both facings through fighter1.3:168 exact source/native comparisons, zero RGB/transparency mismatches and zero clipping in the stationary fixtures.
- Thirty native real-input cases cover both facing directions and every required character clip. They use actual runtime inputs and detached inspect data; no gameplay state is mutated.
- Light, heavy, sweep, descending air-light and descending air-heavy each deal their configured damage once:7,14,10,8,12 in both directions. Air attacks are deliberately timed during descent to meet grounded targets.
- Standing and crouching guard show actual blockstun while preserving health. Repeated ordinary attacks reach zero HP and grounded KO. A health lead plus ordinary timeout reaches the salute/thumbs-up win pose; timeout losers correctly remain standing instead of falsely playing KO.
- The ART-linked adapter passes web hit, opposite-facing hit, guard, jump miss and1P CPU cases. Actual web hits deal17 damage and bind grounded targets briefly; guards take1 chip and never bind; clean jump misses deal0. Bind expires and controls recover. The held final bind frame avoids restarting its expansion animation.
- The source web is registered at the observed hand socket: frame-local(54,14), selected anchor(23,42), authored launch offset(+31,-28), mirrored by the controller. The projectile box(-10,-3,10,6) covers its visible head rather than its entire trailing web.

Hit/hurt boxes, feet/pelvis pivots, phase timing and web trap rules are authored. They are supported by native contact tests and source silhouettes, not recovered Capcom collision metadata. Throws, wall-climb, air-web-swing and the original combo tree remain unsupported. The optional dash clip is covered under an explicit supported dash-special configuration; the normal Spider-Man adapter uses source web projectiles.

## Reproducibility and private outputs

`node scripts/prove-fighter-layered.mjs --web` verifies all source pixels on the current base controller. `node scripts/prove-fighter-web.mjs` verifies the source study directly. Before admission, `node scripts/store-spider-draft.mjs` refreshes the source draft from those proofs, and `pnpm --filter @htn/harness exec node --import tsx ../../scripts/build-spider-local.mjs` prepares reviewed metadata and the actual ART-linked adapter. Both writers refuse to overwrite an admitted source pack.

`node scripts/prove-spider-coverage.mjs --adapter` and `node scripts/prove-fighter-web.mjs --adapter` exercise the packaged helper-linked game. `pnpm --filter @htn/harness exec node --import tsx ../../scripts/check-spider-local.mjs` checks source/core/adapter hashes, unchanged frame/clip geometry, source/native parity, contact damage, guard blockstun, zero-HP KO, gameplay errors and screenshot hashes before writing quality records. A changed base module or actor requires fresh evidence; no stale proof is accepted.

The actual private demo is `data/local-catalog/spider-man-fighter-reference/demo.js`, using `ARCADE.fighter()`. Source actor, original PNG and source quality are in `data/local-assets/spider-man-reference/`. Native evidence is in the adapter's `evidence/coverage/` and `evidence/web/` directories. Good views: `evidence/web/native-overview.png`, `evidence/coverage/p1-heavy-heavy-active.png`, `p2-airLight-airLight-active.png`, `p1-ko-ko-held.png`, and `p2-victory-victory-held.png`.

Source: [Marvel vs.Capcom Spider-Man sheet275483](https://www.spriters-resource.com/arcade/marvelvscapcom/asset/275483/), uploaded by kilburto. Sheet SHA256: `140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f`. All commercial pixels remain under ignored private data/. No paid API, generated art or network request was used for this review and verification.

The private demo is retrieved only by its exact title phrases, “Spider-Man Rooftop Web Duel” or “Rooftop Web Duel.” A general Spider-Man request does not force this fighting game. “Street Fighter with Spider-Man” composes the normal fighter foundation with the source actor; other genres keep their ordinary generation path.

## Actual demo character selection

The private demo explicitly enables character selection with Spider-Man, Batman and Flash. Factory defaults retain direct combat for controlled fixtures. Identity-based selectionNames replace fixed slot names in the wrapper, so the combat HUD follows the characters selected.

`node scripts/prove-spider-selection.mjs` runs the actual saved demo with native inputs. In 1P the human starts unlocked and the opponent is marked CPU; confirmation advances to versus and combat. In 2P both start unlocked, P1 confirmation alone cannot advance, a locked P1 cannot change the other cursor, and P2 must independently confirm. The proof selects Batman versus Spider-Man and checks their actual fighter IDs and HUD labels after entering combat. It binds both module and demo hashes, snapshots and zero runtime errors. Native screenshots are under `evidence/selection/`; useful views are `2p-unlocked.png`, `2p-waiting-for-p2.png`, and `2p-fight.png`.

The admission checker requires this actual-demo proof in addition to move/web coverage; factory-only tests are insufficient to verify the user selection flow.
