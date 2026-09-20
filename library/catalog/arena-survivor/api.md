ARCADE.arenaSurvivor(config) returns {init(api),update(api,dt),draw(api),inspect()}. Construct in init; delegate all three lifecycle calls. api.players selects solo or two independent human players. Original single-screen arcade shooter, four escalating waves by default, with a guardian in the final stage. A match ends within 180 seconds; there is no campaign, save system or RPG dialogue.

Controls for each player: d-pad movement; hold A for auto-aimed bolts; press B for a 0.18-second protective dash with a 2.4-second recharge. Also fires slowly without A. XP drops unlock a brief POWER/HASTE/VITALITY selection: left/right changes choice, A confirms; auto-confirms after seven seconds. Enemies announce spawns, chase around walls and telegraph mage/boss shots. Health, damage protection, cooldowns and scores are per player; no friendly fire. Stay within 22 pixels of a downed partner for 1.6 seconds to revive them; solo cannot revive. All down loses. Stage transitions restore partners and some health; init resets everything.

Supported config only:
- difficulty: finite 0–1, default 0.4, scales enemy and hostile bolt speeds.
- stages: integer 2–6, default 4; final stage includes the guardian.
- playerHealth: integer 3–10, default 6 per human.
- seed: integer 1–2147483647, default 17; private deterministic RNG, never consumed by draw.
- theme: 'garden' or 'crypt', default 'garden'. Tiles only; does not change topology.
- onEvent(event,api): optional synchronous callback after real events (shot, dash, player-hit/down, revive, enemy-shot/defeated, pickup, stage-start/clear, upgrade-offer/upgrade, room-cleared, key-collected, door-unlocked, victory/defeat). Payload carries player/stage/item when applicable.

inspect() returns copied diagnostics, never mutable engine state. Individual kills score 25 (guardian 250), XP drops 5, gems 50; stage clears 100 and victory 500 to each human. Potions restore two HP. Three upgrade levels each; vitality adds one maximum HP and heals two. XP and level are shared, upgrade choices are independent. Bounds: at most 24 scheduled monsters per stage, 100 projectiles total (14 per player), 96 particles and 80 drops. Grid walls use feet-centered actor radii of 5 pixels (guardian 6); visuals do not resize physics. All code/pixels are bundled; no imports/network.

Unsupported: scrolling/open worlds, melee, platform jumping, persistent inventories, loot equipment, quests, tower building or turn-based combat. Implement such mechanics explicitly instead of relabeling this foundation.
