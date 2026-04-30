# poker-app

Web app de poker play money entre amigos. Texas Hold'em No-Limit, cash games 6-max y Sit & Go.

## Stack

- **Lenguaje:** TypeScript (strict mode al máximo).
- **Monorepo:** pnpm workspaces (sin Turborepo — ver ADR 0001).
- **Backend:** Node.js + Fastify + Socket.io + Drizzle + Postgres + Redis (Fase 2).
- **Lobby:** Next.js 14 + Auth.js (Google OAuth) (Fase 4).
- **Mesa:** Vite + React + PixiJS (Fase 3).
- **Tests:** Vitest (unit + integration) + Playwright (E2E, Fase 5).
- **Deploy:** Fly.io (server), Vercel (lobby), Neon/Supabase (Postgres), Upstash (Redis).

## Estructura

```
packages/
├── engine/      # Motor de poker puro (Fase 1)
├── shared/      # Tipos y schemas Zod compartidos
├── server/      # Backend (Fase 2)
├── web-lobby/   # Next.js (Fase 4)
└── web-table/   # Vite + PixiJS (Fase 3)

tooling/
├── tsconfig/    # TypeScript configs compartidos
└── eslint-config/

docs/
└── decisions/   # ADRs
```

Ver `docs/decisions/` para razonamiento arquitectónico completo.

## Setup

Requiere Node 20+, pnpm 10+ y Docker.

```bash
# Instalar dependencias
pnpm install

# Levantar Postgres + Redis
pnpm db:up

# Verificar que todo está bien
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Si los 4 comandos pasan verde y `docker compose ps` muestra ambos servicios `(healthy)`, el setup está completo.

## Comandos

| Comando             | Descripción                                       |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Modo desarrollo en todos los paquetes (paralelo)  |
| `pnpm build`        | Build de producción (orden topológico vía tsc -b) |
| `pnpm test`         | Tests unitarios                                   |
| `pnpm test:watch`   | Tests en modo watch                               |
| `pnpm lint`         | ESLint en todos los paquetes                      |
| `pnpm typecheck`    | TypeScript check sin emit                         |
| `pnpm format`       | Prettier write                                    |
| `pnpm format:check` | Prettier verifica sin escribir                    |
| `pnpm db:up`        | Levantar Postgres + Redis                         |
| `pnpm db:down`      | Bajar contenedores (datos persisten)              |
| `pnpm db:reset`     | Borrar volúmenes y relevantar                     |
| `pnpm clean`        | Borrar dist/ y node_modules/                      |

## Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Las credenciales de Google OAuth se configuran en Fase 2.

## Filosofía del proyecto

Reglas que no se rompen:

1. El servidor es la única fuente de verdad. El cliente nunca decide nada autoritativamente.
2. El motor (`packages/engine`) no tiene side effects ni I/O. Pura función.
3. Tests antes de features nuevas en el motor.
4. Append-only ledger para fichas. Nunca mutar balances directamente.
5. Hand history se persiste al final de cada mano, sin excepciones.
6. Cada bug encontrado en producción → test de regresión antes del fix.

Ver `plan-poker-play-money.md` para el plan completo de 6 fases.
