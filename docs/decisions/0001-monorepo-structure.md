# 0001 — Monorepo structure with pnpm workspaces (no Turborepo)

## Status

Accepted (Phase 0).

## Context

The project is a poker web application composed of multiple deployable units:
a backend server, a Next.js lobby, and a separate Vite-based table client.
These share core types and game logic. We need a structure that:

1. Allows sharing types and a poker engine across all consumers.
2. Keeps the table client decoupled from Next.js for performance.
3. Is manageable by a single developer.
4. Does not pay upfront complexity for value we do not yet need.

## Decision

We use a pnpm workspaces monorepo **without Turborepo** with this structure:

- `packages/shared` — types, Zod schemas, constants. Zero runtime deps beyond Zod.
- `packages/engine` — pure poker logic. Depends only on `shared`.
- `packages/server` — backend (Fastify + Socket.io, Phase 2). Depends on `engine` and `shared`.
- `packages/web-lobby` — Next.js app for landing, lobby, admin (Phase 4). Depends on `shared`.
- `packages/web-table` — Vite + React + PixiJS for the table client (Phase 3). Depends on `shared`.
- `tooling/tsconfig` — shared TypeScript configurations.
- `tooling/eslint-config` — shared ESLint configuration.

Cross-package orchestration is done via `pnpm -r` scripts in the root `package.json`,
not via Turborepo.

The engine is deliberately isolated from any I/O (network, DB, filesystem)
to allow exhaustive unit testing without infrastructure.

## Consequences

### Positive

- Strong type safety across boundaries via `shared`.
- Engine can be tested in milliseconds without spinning up servers.
- One less moving piece (no `turbo.json`, no Turborepo cache invalidation surprises).
- Lower onboarding cost — anyone who has used pnpm before can navigate the repo.
- Web-lobby and web-table can evolve independently without dragging
  Next.js's overhead into the table's hot path.

### Negative

- Higher initial setup complexity than a single Next.js app.
- No build/test caching across runs. For now this is fine: builds are seconds.
- `pnpm -r` runs are sequential or naively parallel; no topological awareness
  beyond what pnpm itself provides for workspace deps.

### Mitigations

- TypeScript project references (`tsc -b`) handle build ordering for libraries.
- If at any phase a `pnpm test` or `pnpm build` becomes painfully slow (> 30s
  on warm cache), revisit and consider adding Turborepo. Adding it later is
  cheap; removing it once embedded is not.

## Alternatives considered

- **pnpm workspaces + Turborepo** — rejected for now. Caching value is minimal
  for a single dev with fast incremental TS builds. The configuration overhead
  and the occasional `Could not find pipeline` debug session are not worth it
  yet. Door is open to add it later.
- **Single Next.js app with API routes** — rejected because Next.js's serverful
  components and edge runtime restrictions don't pair well with persistent
  WebSocket connections that poker requires.
- **Nx instead of Turborepo** — rejected. Nx's power is wasted without a team
  and adds significant cognitive overhead for one developer.
- **Separate repositories (Fazt-style)** — rejected because all packages are
  TypeScript and share types. The cross-repo overhead would defeat the entire
  purpose of having a single source of truth for `Card`, `GameState`, etc.

## Revisit when

- Build or test commands take over 30 seconds on warm cache — consider Turborepo.
- We add a CI matrix that runs the same jobs many times — caching becomes valuable.
- A second developer joins — reconsider tooling investments.
