# CYBER RUN — high-density runner prototype v0.4

School iPad (landscape Safari), iPhone and PC browser arcade runner. This repository is for a lightweight, no-cost friends-only game. The ranked online leaderboard is **not implemented yet**.

## Try it

- GitHub Pages preview: https://8mahi8.github.io/cyber-run/
- Start: `RUN START`. Jump: right button (tap twice for double jump). Crouch: hold left button. PC: `Space`/`↑` and `↓`. Pause: `Ⅱ` or `P`.
- 3 HP, accelerated auto-run, checkpoints are not added, rare random recovery hearts only after injury.

## v0.4 changes from v0.3

- Coins are mainly at **ground-run pickup height**; raised collectibles outline intended jumps.
- Reworked jump velocity and gravity together; tall blockers require double jumps.
- **16 curated obstacle patterns** including 2- and 3-obstacle chains, moving elements, small gaps and short coin runs.
- Speed: starts at 335 game units/s, accelerates by 7.5 units/s² to a cap of 790 units/s (~2.36×). Increased transit streaks, ground pulses and earlier scenery changes.
- Offline automated solver validates **zero-damage routes** at the **same 120Hz physics cadence as gameplay**, including moving obstacle phases, jump/crouch timing and grounded exits. Runtime uses certified templates without costly per-chunk graph searches.
- Faster first obstacle appearance and spawn-time speed estimation to minimize future-speed drift.

## Project layout

- `core.js`: deterministic pattern generator and physics-based reachability proof.
- `game.js`: rendering, keyboard/pointer controls, local best scores and gameplay.
- `style.css`: responsive mobile controls and HUD.
- `index.html`: local development entry point (the public Pages branch has a standalone HTML build).
- `tests/core.test.js`, `tests/route-replay.test.js`, `tests/browser-smoke.test.js`: Node tests.

Run tests with `node --test tests/*.test.js`. No dependencies are required.

## Caveats

- Normal phone/iPad Safari gameplay still needs real-device feedback. Chromium browser smoke checks are not a substitute for iOS Safari.
- Route certification **proves at least one physically successful input sequence for each template**; it does not guarantee all runs are easy or that a human can always react to every configuration. Collectible recovery arcs are optional guidance rather than mandatory goals.
- Pairwise segment continuity is protected by a grounded end-state and recovery spacing, but extreme frame drops may make tight combinations harder on slow devices.
- Do not implement/save scores to an online database until leaderboard rules and free-tier safety are agreed.