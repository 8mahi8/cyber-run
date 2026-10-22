# CYBER RUN — prototype v0.2

2D horizontal endless runner for school iPad Safari; solo play. This is a development-only prototype. The ranking, account system, and Google Sites distribution are not yet implemented.

## Controls
- Tap right / Space / ArrowUp: jump, then tap again for a double jump.
- Hold left / ArrowDown: crouch. Release to stand. Holding crouch across landing works.
- Pause button or P/Escape: pause/resume.

## Gameplay
- HP 3, 1 damage per obstacle or missed small gap, 1.35 seconds of invulnerability.
- Speed rises continuously with a limit. Score comes from distance and collectibles.
- Procedural, repeatable-on-seed prebuilt patterns. Each segment holds at most one hazard; soft difficulty tiers increase variety.
- Small gaps only: all can be crossed using one standard jump. No large gaps or split routes.
- Rare random healing pickup only when injured; no rewards or progression purchases.
- Cyberpunk visual style. The best score is stored **only on the local device**.

## Testing
From the repository root run `node --test tests/*.test.js` (Node.js 20+). This checks generation determinism, speed cap, obstacles, safe gaps, healing constraints, and a simulated browser loop. Tests cannot replace an actual Safari device test.

## Development notes
- `index.html`: UI structure
- `style.css`: responsive layout
- `core.js`: seeded procedural generation and pure geometry helpers
- `game.js`: browser rendering, physics, input, HUD and game loop
- `tests/`: Node test runner checks

No third-party runtime libraries or paid dependencies are required. **Main branch is not modified by this draft PR.**

### Known limitations / next
1. Run on school iPad Safari and adjust the jump arc, crouch sensitivity, collisions and frame pacing.
2. Tune pattern variety and recovery rarity using actual play sessions.
3. Improve graphics / effects / sound, which are intentionally basic right now.
4. Discuss online ranking architecture later, separate from core gameplay.
