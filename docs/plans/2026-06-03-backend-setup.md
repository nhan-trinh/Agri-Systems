# Backend Structure Setup Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Set up the backend project directory structure, core config files (`package.json`, `tsconfig.json`, `.env.example`, `docker-compose.yml`), Prisma schema, database client, and routing/shared scaffolding for AgriTrace Carbon Express project.

**Architecture:** Modular Monolith architecture where each of the 10 domains is an independent module with its own router, controller, service, repository, dto, types, and tests. A shared layer (`src/shared/`) handles cross-cutting concerns (middleware, guards, utils, validation pipe, standard responses).

**Tech Stack:** Node.js v20, Express, TypeScript, Prisma ORM (PostgreSQL + PostGIS), Mongoose (MongoDB), Redis (BullMQ, rate-limiting), Zod.

---

## Proposed Tasks

### Task 1: Initialize configurations
**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.env`
- Create: `docker-compose.yml`

### Task 2: Setup Prisma schema
**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/prisma/client.ts`

### Task 3: Setup Express core infrastructure
**Files:**
- Create: `src/config/app.config.ts`
- Create: `src/shared/utils/response.helper.ts`
- Create: `src/shared/pipes/validate.pipe.ts`
- Create: `src/app.ts`
- Create: `src/server.ts`

### Task 4: Scaffolding 10 modules
**Files:**
- Create folders:
  - `src/modules/auth`
  - `src/modules/farmer`
  - `src/modules/farm-zone`
  - `src/modules/farming-log`
  - `src/modules/warehouse`
  - `src/modules/checkvn-qr`
  - `src/modules/carbon`
  - `src/modules/reporting`
  - `src/modules/notification`
  - `src/modules/ocr`
- Create file templates in each folder (router, controller, service, repository, types, dto).

---

## Verification Plan

### Automated Tests
- Run `tsc --noEmit` to ensure TypeScript compilation passes.
- Run `npx prisma generate` to verify Prisma schema validates successfully.

### Manual Verification
- Start the server using `npm run dev` and check if it starts without errors.
