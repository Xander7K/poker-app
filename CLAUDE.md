# poker-app — Context for Claude Code

## What this project is

Web app of **Texas Hold'em No-Limit play money** for ~50 friends. Cash games 6-max + Sit & Go. Single owner (Xander7K, GitHub). Side-project pace.

Repo: https://github.com/Xander7K/poker-app — public, CI on push to `main`.

## Stack

- **Language**: TypeScript with `strict` at maximum (incl. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Monorepo**: pnpm workspaces, **deliberately no Turborepo** (ADR 0001).
- **Engine**: pure logic, no I/O, no `Date.now()`, no `Math.random()` (Clock and RNG injected).
- **Backend (Phase 2)**: Fastify + Socket.io + Drizzle + Postgres + Redis.
- **Lobby (Phase 4)**: Next.js 14 + Auth.js (Google OAuth) (ADR 0002).
- **Table client (Phase 3)**: Vite + React + PixiJS.
- **Tests**: Vitest unit/integration; fast-check for property tests; Playwright for E2E (Phase 5).
- **Deploy**: Fly.io (server), Vercel (lobby), Neon/Supabase (Postgres), Upstash (Redis).

## Repo layout

```
packages/
├── shared/        # Zod schemas + cross-package types (Phase 0)
├── engine/        # Pure poker engine (Phase 1, COMPLETE)
├── server/        # Backend placeholder (Phase 2)
├── web-lobby/     # Next.js placeholder (Phase 4)
└── web-table/     # Vite placeholder (Phase 3)

tooling/
├── tsconfig/      # Shared TypeScript configs
└── eslint-config/ # Shared ESLint flat config v9

docs/decisions/    # ADRs
.github/workflows/ # CI: install → format:check → lint → build → typecheck → test
```

## Phase status

- **Phase 0 (Setup)**: ✅ Done 2026-04-30. 18 commits.
- **Phase 1 (Engine)**: ✅ Done 2026-05-08. 30 commits. **253 tests passing in ~2.3s**.
- **Phase 2 (Server + Auth + DB)**: not started.
- Phases 3–6: not started.

## Engine surface (Phase 1, in `packages/engine/src/`)

```
types/         Card, Suit, Rank, Player, Action, Pot, GamePhase, HandRank, GameState
rng/           RNG interface, CryptoRNG (prod), SeedableRNG (xoshiro256**, tests/replay), shuffle
evaluator/     HandEvaluator interface + PokerSolverEvaluator (wraps `pokersolver` npm pkg)
fsm/           positions, start-hand, blinds, deal, actions, betting, pots, transitions, showdown
history/       HandEvent + HandHistory types, HandRecorder, replayHand
clock.ts       Clock interface, SystemClock, FakeClock
errors.ts      EngineError + 5 typed subclasses (IllegalAction/Bet, WrongTurn, HandStart, InvariantViolated)
```

API is pure, immutable, deterministically replayable from `(rngSeed, actions[])`.

## Key engine conventions

- **Every operation returns a new `GameState`**. Inputs never mutated.
- **`actedThisRound: SeatIndex[]`** is the load-bearing field for round-closure detection. It's reset on each new street and on every full raise that reopens action. Append-only on fold/check/call/short-all-in.
- **`pokersolver` is 1-based for hand category ranks** (HighCard=1, …, StraightFlush=9). We map to our 0-based `HandRank` by `solved.rank - 1`.
- **`value` ordinal** is synthesized as `handRank * 1e9 + base15(solved.cards by importance)`. Pokersolver doesn't expose a totally-ordered cross-category number.
- **Three player predicates**, each for a distinct purpose:
  - `isDealtIn` — start condition for a new hand (status not Empty/SittingOut + `stack > 0`).
  - `isInHand` — currently in this hand (Active or AllIn). Used for dealing cards.
  - `canStillAct` — Active only (not AllIn, not Folded). Used for next-to-act.
- **Pot eligibility for the initial pot in `postBlinds`** uses `Active || AllIn`, not `isDealtIn` — covers the case where antes/blinds put a player all-in.
- **Lint forbids non-null assertions in `src/`**. We use `as T` casts (with comments documenting the invariant) or guards instead.

## Architecture decisions (ADRs)

- [ADR 0001](docs/decisions/0001-monorepo-structure.md) — pnpm workspaces, no Turborepo.
- [ADR 0002](docs/decisions/0002-auth-strategy.md) — Auth.js + Google OAuth in lobby + short-lived JWT for game-server WebSocket.

### Pending ADRs to write (deferred from Phase 1)

These are real architectural decisions made during Phase 1 that should be formalized:

1. **`actedThisRound` field as round-closure mechanism** — chosen over the more naive "action returned to lastAggressor" rule. Necessary to handle BB option preflop, short all-in non-reopen, and all-checks postflop without ad-hoc special cases.
2. **Base-15 encoding over `solved.cards` for `value` ordinal** — pokersolver doesn't expose a single totally-ordered number across all 9 categories, so we synthesize one. Ace-rank=13 fits comfortably in base-15.
3. **`isDealtIn` / `isInHand` / `canStillAct` as three distinct predicates** — same player can be "dealt in but not in hand", "in hand but cannot act now". Conflating them caused real bugs in Phase 1 development.

## Known latent issues (not blocking, documented in code)

- After a **short all-in that doesn't reopen action**, our model still allows the original raiser to re-raise when action returns to them. Tournament rules say call/fold only. Implementing requires per-seat "right to reraise" tracking, not currently in `GameState`. Acceptable for play-money among friends; revisit if it becomes a real problem.

## CI quirks worth knowing

- **Build must run BEFORE typecheck** in CI. `tsc --noEmit` in `engine` needs `packages/shared/dist/index.d.ts` to exist (the `types` field of shared's `package.json` points there). Cleanly checked-out CI fails if typecheck runs first. See [.github/workflows/ci.yml](.github/workflows/ci.yml).
- `pnpm/action-setup@v4` no longer accepts a `version:` input when `packageManager` is set in root `package.json`. The version comes from the `packageManager` field automatically.
- pnpm 10 ignores `esbuild` build scripts by default with a warning. Vitest works fine without them on this platform; if Phase 3 (Vite) or Phase 5 (Playwright/coverage) needs them, add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to root `package.json`.

## Working rhythm with the user

The user works through phases sequentially via per-phase instruction docs (e.g. `fase-1-instrucciones.md`). The convention:

1. **One step at a time, one commit per step.** Wait for explicit user confirmation before proceeding to the next step.
2. **Verification before commit** for every step: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format:check` (and `pnpm build` when types cross packages).
3. **Bugs in the plan get flagged and fixed** with a regression test before moving on. Multiple plan bugs were found in Phase 1 — see commit history for examples.
4. **Don't advance to the next phase** until the current one is fully verified (including a clean `pnpm install --frozen-lockfile` from scratch and CI green).

## Local environment notes

Windows 11. Node 20+. pnpm 10.0.0 (pinned in `packageManager` field). Docker Desktop for Postgres + Redis (does not auto-start; launch via `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`). `gh` CLI installed at `C:\Program Files\GitHub CLI\gh.exe` but not yet authenticated — public-repo API queries via `curl` work as a workaround.

## Next step

Phase 2: server + auth + DB. The engine is ready to be consumed — pure functions, immutable state, deterministic replay. The server's job is to host hands using the engine, persist `HandHistory`, mint JWTs, manage WebSocket connections.
