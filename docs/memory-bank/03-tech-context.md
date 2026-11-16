# 03. Tech Context (Stack, Ambiente e Comandos)

## 1. Stack Oficial
- **Banco de Dados:** PostgreSQL 16 + Redis 7 (Cache e Locks Distribuídos)
- **Backend:** Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async + `asyncpg`), Alembic, Structlog
- **Qualidade Backend:** Ruff (Lint + Format), Mypy (Strict), Pytest + Pytest-Asyncio + HTTPX
- **Frontend:** Node 22 LTS, React 19, TypeScript 5.x (`strict: true`), Vite (ou Next.js App Router), Tailwind CSS, TanStack Query v5, React Hook Form + Zod
- **Gerador de Contratos:** `@hey-api/openapi-ts` (gera cliente e tipos em `apps/web/src/api-client`)
- **Qualidade Frontend:** ESLint, TypeScript Compiler (`tsc --noEmit`), Vitest, Playwright (E2E)

## 2. Bibliotecas Proibidas
- Backend: `requests` (usar `httpx` assíncrono), `unittest` clássico (usar `pytest`), `float` nativo para moeda.
- Frontend: `Moment.js` (usar `date-fns` ou `Intl`), `Redux` (usar `TanStack Query` + `Zustand`).

## 3. Comandos Principais de Desenvolvimento
- Subir infraestrutura local: `docker compose up -d db redis`
- Rodar migrations: `cd apps/api && alembic upgrade head`
- Sincronizar contratos OpenAPI: `./scripts/sync-contracts.sh`
- Validar projeto completo (Gate obrigatório): `./scripts/verify-all.sh`