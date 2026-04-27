# Phase 1: Foundation

**Status: COMPLETED**

Phase 1 establishes the full project scaffold, database schema, authentication system, UI framework, route structure, and deployment infrastructure for the Partners + Capital investor portal.

---

## Scope

### 1. Next.js 16 Scaffolding

- Initialized Next.js 16.2.4 with TypeScript and the App Router
- React 19.2.4 with React Server Components
- Configured `next.config.ts` for the project
- Set up `tsconfig.json` with strict mode
- ESLint 9 configuration via `eslint.config.mjs`
- Vitest 4 for unit testing (`vitest.config.ts`)

### 2. Prisma 7 Schema with MySQL Adapter

- Prisma 7.8.0 with `@prisma/adapter-mariadb` for MySQL on Cloudways
- `prisma.config.ts` at the project root for Prisma configuration
- Prisma singleton in `src/lib/prisma.ts`
- Full schema (`prisma/schema.prisma`) covering all models:
  - **Auth & Users**: User, Account, Session, VerificationToken, PasswordResetToken, TwoFactorSecret
  - **Organization**: White-label config (branding colors, logo, legal, 2FA policy)
  - **Investments**: AssetClass, Investment, ClientInvestment
  - **Capital Activity**: Contribution, Distribution (with types: CASH, REINVESTMENT, RETURN_OF_CAPITAL)
  - **Document Vault**: Document (K1s, tax forms, quarterly reports, PPMs, etc.)
  - **Advisor Sharing**: Advisor, AdvisorAccess (with permission levels)
  - **Activity & Notifications**: DealRoomUpdate, ActivityFeed, Notification, AuditLog
  - **API Integration**: ApiKey, ApiLog, WebhookEndpoint, WebhookDelivery, SyncLog
  - **System**: SystemSetting
- Soft delete pattern (`deletedAt` timestamps) on all relevant models
- Comprehensive indexes on foreign keys, status fields, and deletion timestamps
- Roles: SUPER_ADMIN, ADMIN, CLIENT, ADVISOR
- Admin sub-roles: FULL_ACCESS, READ_ONLY, DATA_ENTRY

### 3. NextAuth 5 (beta.30)

- NextAuth 5.0.0-beta.30 configured in `src/lib/auth.ts`
- Credentials provider with bcryptjs password hashing
- JWT strategy (no database sessions by default)
- `@auth/prisma-adapter` integration
- Auth API route at `src/app/api/auth/[...nextauth]/route.ts`
- Signup endpoint at `src/app/api/auth/signup/route.ts`
- Forgot password endpoint at `src/app/api/auth/forgot-password/route.ts`
- TOTP-based 2FA support via `otpauth` library (`src/lib/two-factor.ts`)
- QR code generation for 2FA enrollment via `qrcode` package
- API key authentication helper in `src/lib/api-auth.ts`

### 4. Shadcn/ui + Tailwind CSS 4

- Tailwind CSS 4 with `@tailwindcss/postcss` plugin
- PostCSS configured via `postcss.config.mjs`
- Shadcn/ui utility functions: `cn()` in `src/lib/utils.ts` using `clsx` and `tailwind-merge`
- `class-variance-authority` for component variants
- `lucide-react` for icons
- `recharts` for future dashboard charting
- Global styles in `src/app/globals.css`

### 5. Route Groups with Placeholder Pages

All route groups are established with layout files and placeholder pages:

- **`(auth)`** -- Public authentication pages
  - `/login` -- Login page
  - `/forgot-password` -- Password reset request page
  - Layout: `src/app/(auth)/layout.tsx`

- **`(admin)`** -- Admin panel (SUPER_ADMIN and ADMIN roles)
  - `/admin` -- Admin dashboard
  - `/admin/clients` -- Client management
  - `/admin/investments` -- Investment management
  - `/admin/documents` -- Document management
  - `/admin/activity` -- Activity feed management
  - `/admin/audit-log` -- Audit log viewer
  - `/admin/api-keys` -- API key management
  - `/admin/settings` -- Organization settings
  - Layout: `src/app/(admin)/admin/layout.tsx`

- **`(portal)`** -- Client-facing investor portal
  - `/dashboard` -- Client dashboard
  - `/investments` -- Investment portfolio view
  - `/documents` -- Document vault
  - `/capital-activity` -- Contributions and distributions
  - `/advisors` -- Advisor sharing management
  - `/settings` -- Account settings
  - Layout: `src/app/(portal)/layout.tsx`

- **`(advisor)`** -- Advisor read-only views
  - `/advisor/dashboard` -- Advisor dashboard
  - Layout: `src/app/(advisor)/layout.tsx`

- **API Routes**
  - `/api/auth/[...nextauth]` -- NextAuth handler
  - `/api/auth/signup` -- User registration
  - `/api/auth/forgot-password` -- Password reset
  - `/api/health` -- Health check endpoint
  - `/api/organization` -- Organization config API

### 6. Deploy Scripts and PM2 Configuration

- **`scripts/setup.sh`** -- First-time setup (install deps, generate Prisma client, run migrations, seed database, create directories)
- **`scripts/deploy.sh`** -- Full deployment pipeline supporting `staging` and `production`:
  - Environment file loading (`.env.staging` / `.env.production`)
  - Pre-flight checks (git state, SSH connectivity)
  - Quality checks (lint, Prisma validate)
  - Application build
  - Database backup via mysqldump
  - Symlinked release directory structure (keeps last 5 releases)
  - rsync file transfer
  - Prisma migrations on server
  - PM2 process restart
  - Health check verification
  - Email/Slack deploy notifications
- **`scripts/rollback.sh`** -- Release rollback script
- **`scripts/db-migrate.sh`** -- Database migration helper
- **`ecosystem.config.js`** -- PM2 configuration:
  - `partnersandcapital-production` (port 3000)
  - `partnersandcapital-staging` (port 3001)
  - Auto-restart, memory limits (1GB), structured logging

### 7. Seed File

- `prisma/seed.ts` seeds the database with:
  - Default organization ("Partners + Capital") with branding colors and disclaimer
  - Super admin user: `admin@partnersandcapital.com` / `admin123!`
  - Default asset classes: Oil & Gas, Real Estate, Private Credit, Specialty
- Configured as `npx tsx prisma/seed.ts` via `package.json` prisma seed config

### 8. Health Check Endpoint

- `GET /api/health` returns application health status
- Used by the deploy script for post-deployment verification
- Returns HTTP 200 when the application is running correctly

### 9. Organization White-Label Config

- `Organization` model stores all branding configuration:
  - Name, legal name, logo URL, favicon URL
  - Primary, secondary, and accent colors
  - Contact info (email, phone, website, address)
  - Compliance text (disclaimer, privacy policy, terms of service)
  - 2FA policy (mandatory, optional, or disabled)
- Organization provider component (`src/components/providers/organization-provider.tsx`) for client-side access
- Organization API route (`/api/organization`) for fetching config
- Organization helper library (`src/lib/organization.ts`)

### 10. Supporting Libraries

- `src/lib/prisma.ts` -- Prisma client singleton
- `src/lib/auth.ts` -- NextAuth configuration
- `src/lib/audit.ts` -- Audit logging with IP and user-agent capture
- `src/lib/two-factor.ts` -- TOTP 2FA generation and verification
- `src/lib/api-auth.ts` -- API key authentication
- `src/lib/organization.ts` -- Organization config loading
- `src/lib/email.ts` -- Elastic Email integration for transactional emails
- `src/lib/utils.ts` -- Utility functions (cn, etc.)
- `src/components/providers/session-provider.tsx` -- NextAuth session wrapper
- `src/components/providers/organization-provider.tsx` -- Organization context provider

---

## What Phase 1 Does NOT Include

Phase 1 is strictly the foundation. The following are deferred to later phases:

- Functional CRUD for investments, clients, documents (Phase 2)
- Client portal dashboard with real data and charts (Phase 3)
- Document upload/download and vault functionality (Phase 3)
- Advisor invitation flow and read-only portal (Phase 4)
- API integration layer with QuickBooks sync (Phase 5)
- Email notifications, activity feed posts (Phase 5)
- Production hardening, performance tuning, GA4 analytics (Phase 6)

---

## Files Created

```
partnersandcapital.com/
  ecosystem.config.js
  next.config.ts
  package.json
  postcss.config.mjs
  prisma.config.ts
  tsconfig.json
  vitest.config.ts
  eslint.config.mjs
  prisma/
    schema.prisma
    seed.ts
  scripts/
    setup.sh
    deploy.sh
    rollback.sh
    db-migrate.sh
  src/
    lib/
      prisma.ts
      auth.ts
      audit.ts
      two-factor.ts
      api-auth.ts
      organization.ts
      email.ts
      utils.ts
    components/
      providers/
        session-provider.tsx
        organization-provider.tsx
    app/
      layout.tsx
      page.tsx
      globals.css
      (auth)/
        layout.tsx
        login/page.tsx
        forgot-password/page.tsx
      (admin)/admin/
        layout.tsx
        page.tsx
        clients/page.tsx
        investments/page.tsx
        documents/page.tsx
        activity/page.tsx
        audit-log/page.tsx
        api-keys/page.tsx
        settings/page.tsx
      (portal)/
        layout.tsx
        dashboard/page.tsx
        investments/page.tsx
        documents/page.tsx
        capital-activity/page.tsx
        advisors/page.tsx
        settings/page.tsx
      (advisor)/
        layout.tsx
        advisor/dashboard/page.tsx
      api/
        auth/[...nextauth]/route.ts
        auth/signup/route.ts
        auth/forgot-password/route.ts
        health/route.ts
        organization/route.ts
    types/
    hooks/
    __tests__/
```
