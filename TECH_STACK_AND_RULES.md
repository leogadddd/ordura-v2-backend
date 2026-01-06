# Ordura v2 - POS System | Tech Stack & Project Rules

## Overview

Offline-first POS system for retail/store operations. Works without internet; syncs to server when connection restores.

---

## Tech Stack

### Frontend

- **Framework**: React 18+ (TypeScript)
- **Desktop Container**: Tauri (native webview + Rust backend for peripherals)
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) or Ant Design
- **Local Storage**: SQLite (via Tauri plugin)
- **State Management**: TanStack Query (React Query) + Zustand or Jotai
- **HTTP Client**: axios or fetch with retry logic

### Backend

- **Runtime**: Node.js (18+)
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma or TypeORM
- **Cache**: Redis (optional, for realtime features)
- **Authentication**: JWT + refresh tokens
- **API**: REST (with sync endpoints for outbox/pull)

### Offline Sync Strategy

- **Local Outbox Pattern**: transactions stored locally in SQLite; background queue syncs to server
- **Conflict Resolution**: timestamp-based, server-wins (configurable per entity)
- **Pull/Push Endpoints**: dedicated `/sync` routes for bi-directional data updates

---

## Project Structure

```
ordura-v2/
├── apps/
│   ├── frontend/           # React + Tauri desktop app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/        # local DB, sync logic, utilities
│   │   │   └── App.tsx
│   │   ├── src-tauri/      # Tauri Rust backend
│   │   └── package.json
│   └── backend/            # NestJS server
│       ├── src/
│       │   ├── modules/    # feature modules (products, sales, inventory, auth)
│       │   ├── common/     # filters, guards, interceptors
│       │   └── main.ts
│       ├── prisma/         # schema + migrations
│       └── package.json
└── TECH_STACK_AND_RULES.md
```

---

## Project Rules

### 1. Code Quality

- Use TypeScript everywhere (strict mode enabled).
- ESLint + Prettier configured for both frontend and backend.
- No `any` types; use proper interfaces/types.

### 2. Feature Development

- Features are scoped to modules (NestJS) / domains (React).
- Each major feature = 1 PR with clear commit messages.
- Offline sync logic decoupled from UI; live in `lib/sync` or `services/sync`.

### 3. Database & Migrations

- Schema changes = new Prisma migration.
- Never manual SQL; always use Prisma CLI.
- Migrations are version-controlled.

### 4. Offline-First Requirements

- Every transaction/sale MUST be saved to local SQLite first.
- Background sync runs every 30s or on manual "Sync" button.
- Conflict handling logged; UI shows sync status (pending, synced, conflict).

### 5. API Contracts

- All endpoints return consistent JSON shape: `{ success: bool, data?: T, error?: string, code?: string }`.
- Sync endpoints use timestamps + incremental updates.

### 6. Testing

- Unit tests for business logic (calculations, validations).
- E2E tests for critical flows (sale, payment, sync).
- No requirement for 100% coverage; focus on high-risk areas.

### 7. Git Workflow

- Main branch = production-ready.
- Feature branches: `feature/short-desc` or `fix/short-desc`.
- Squash commits on merge.

---

## Getting Started

### Prerequisites

- Node.js 18+ & npm/yarn
- PostgreSQL (local or Docker)
- Tauri CLI (`npm install -g @tauri-apps/cli@latest`)

### 1. Clone & Install Dependencies

```bash
cd ordura-v2
npm install
```

### 2. Setup Backend

```bash
cd apps/backend
cp .env.example .env
# Edit .env with your DB connection
npm install
npx prisma migrate dev --name init
npm run start:dev
```

### 3. Setup Frontend

```bash
cd apps/frontend
npm install
npm run tauri dev
```

Backend runs on `http://localhost:3000` (NestJS default).  
Frontend launches as desktop app.

---

## NestJS Overview (Crash Course)

NestJS is a backend framework for Node.js built on Express/Fastify. It enforces a modular, layered architecture similar to Spring Boot or Laravel.

### Core Concepts

**1. Modules**

- Bundle related features together.
- Each module = controller(s) + service(s) + exports.
- Example: `ProductsModule` with `ProductsController` + `ProductsService`.

```typescript
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

**2. Controllers**

- Handle HTTP requests, delegate to services.
- Routes defined via decorators (`@Get()`, `@Post()`, etc.).

```typescript
@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }
}
```

**3. Services**

- Contain business logic and DB queries.
- Injected into controllers via dependency injection.

```typescript
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany();
  }

  create(data: CreateProductDto) {
    return this.prisma.product.create({ data });
  }
}
```

**4. Dependency Injection (DI)**

- NestJS automatically injects services where needed.
- No manual instantiation; cleaner & more testable.

**5. Decorators**

- `@Module()`, `@Controller()`, `@Service()` organize code.
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()` define routes.
- `@Param()`, `@Query()`, `@Body()` extract request data.
- `@UseGuards()`, `@UseFilters()` middleware/auth.

**6. Middleware / Guards / Interceptors**

- **Guards**: check permissions (e.g., JWT auth).
- **Filters**: handle exceptions globally.
- **Interceptors**: transform responses, log, etc.

### Example NestJS Flow

```
Client → POST /products → ProductsController.create()
  → ProductsService.create()
  → PrismaService (ORM) → PostgreSQL
  → Response { success: true, data: newProduct }
```

### Common Patterns for POS

- `AuthModule`: JWT login/refresh, user roles (admin, cashier).
- `ProductModule`: CRUD products, barcode lookup.
- `SalesModule`: create sales, line items, payments.
- `InventoryModule`: stock levels, adjustments, sync.
- `SyncModule`: /sync/push (client → server), /sync/pull (server → client).

NestJS feels like "opinionated Express with decorators"; once you get the module/service pattern, it's very scalable.

---

## Next Steps

1. Initialize repo structure (monorepo with apps/frontend and apps/backend).
2. Set up PostgreSQL + Prisma schema for products, sales, inventory.
3. Create auth module in NestJS.
4. Build POS UI shell in React + Tauri.
5. Integrate offline sync logic.
