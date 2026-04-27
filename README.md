# Partners + Capital -- Investor Portal

A white-label investor portal for fund managers. Partners + Capital gives limited partners (LPs) secure, branded access to their investment performance, documents, capital activity, and advisor sharing -- all through a self-hosted, single-tenant platform.

This is not a multi-tenant SaaS product. Each customer gets their own private repository and deploys on their own infrastructure. Branding, colors, disclaimers, and 2FA policies are all configuration-driven through the Organization table.

---

## Tech Stack

| Layer             | Technology                                         |
| ----------------- | -------------------------------------------------- |
| Framework         | Next.js 16 + TypeScript + React Server Components  |
| Database          | MySQL on Cloudways + Prisma 7 ORM                  |
| Auth              | NextAuth 5.0.0-beta.30 (JWT + Credentials + TOTP)  |
| UI                | Shadcn/ui + Tailwind CSS 4 + Radix UI + Lucide     |
| Charts            | Recharts                                           |
| Email             | Elastic Email (transactional)                      |
| Process Manager   | PM2                                                |
| Deployment        | rsync + symlinked releases + mysqldump backups      |
| Testing           | Vitest + React Testing Library                     |

---

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8.0+ (or MariaDB 10.6+)
- npm

### Setup

```bash
# 1. Clone the repository
git clone git@github.com:hunegnaw/PartnersAndCapital.git partnersandcapital.com
cd partnersandcapital.com

# 2. Copy the environment file
cp .env.example .env

# 3. Configure your database connection in .env
#    DATABASE_URL="mysql://user:password@localhost:3306/partnersandcapital"
#    NEXTAUTH_SECRET="generate-a-random-secret-here"
#    NEXTAUTH_URL="http://localhost:3000"

# 4. Run the setup script (installs deps, generates Prisma client, runs migrations, seeds DB)
./scripts/setup.sh

# 5. Start the development server
npm run dev
```

Alternatively, run the steps manually:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Login

| Field    | Value                            |
| -------- | -------------------------------- |
| Email    | `admin@partnersandcapital.com`   |
| Password | `admin123!`                      |

**Change this password immediately after first login.**

---

## Project Structure

```
partnersandcapital.com/
  prisma/
    schema.prisma          # Database schema (all models)
    seed.ts                # Seed script (admin user, org config, asset classes)
  scripts/
    setup.sh               # First-time setup
    deploy.sh              # Deploy to staging or production
    rollback.sh            # Roll back to a previous release
    db-migrate.sh          # Database migration helper
  src/
    app/
      (auth)/              # Public auth pages (login, forgot password)
      (admin)/admin/       # Admin panel (clients, investments, documents, settings, etc.)
      (portal)/            # Client investor portal (dashboard, investments, documents, etc.)
      (advisor)/           # Advisor read-only views
      api/
        auth/              # NextAuth routes + signup + forgot password
        health/            # Health check endpoint
        organization/      # Organization config API
    components/
      providers/           # Session and organization context providers
    lib/
      prisma.ts            # Prisma client singleton
      auth.ts              # NextAuth configuration
      audit.ts             # Audit logging
      two-factor.ts        # TOTP 2FA support
      api-auth.ts          # API key authentication
      organization.ts      # Organization config loader
      email.ts             # Elastic Email integration
      utils.ts             # Utility functions
    hooks/                 # Custom React hooks
    types/                 # TypeScript type definitions
    __tests__/             # Test files
  ecosystem.config.js      # PM2 configuration
  prisma.config.ts         # Prisma configuration
```

---

## Available Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start development server                       |
| `npm run build`      | Generate Prisma client and build for production |
| `npm start`          | Start production server                        |
| `npm run lint`       | Run ESLint                                     |
| `npm test`           | Run tests with Vitest                          |
| `npm run test:watch` | Run tests in watch mode                        |

---

## Database

The project uses Prisma 7 with the MariaDB adapter (`@prisma/adapter-mariadb`) targeting MySQL on Cloudways.

### Key Models

- **User** -- Roles: SUPER_ADMIN, ADMIN, CLIENT, ADVISOR. Soft delete enabled.
- **Organization** -- White-label configuration (branding, colors, legal, 2FA policy).
- **Investment / ClientInvestment** -- Investments and per-client allocations with IRR, multiples, and return tracking.
- **Contribution / Distribution** -- Capital calls and distributions with status tracking.
- **Document** -- Document vault supporting K1s, tax forms, quarterly reports, PPMs, and more.
- **Advisor / AdvisorAccess** -- Advisor invitation and permission system.
- **AuditLog** -- Comprehensive audit trail with IP and user-agent.
- **ApiKey / ApiLog** -- API integration layer for external systems (QuickBooks, etc.).

### Common Commands

```bash
npx prisma migrate dev          # Create and apply migrations (development)
npx prisma migrate deploy       # Apply migrations (production)
npx prisma db seed              # Seed the database
npx prisma studio               # Open Prisma Studio GUI
```

---

## Deployment

### Deploy to Staging

```bash
./scripts/deploy.sh staging
```

### Deploy to Production

```bash
./scripts/deploy.sh production
```

Production deployments require:
- A clean git working directory
- The `main` or `master` branch checked out
- The branch to be up to date with origin

### What the Deploy Script Does

1. Loads environment from `.env.staging` or `.env.production`
2. Runs pre-flight checks (git status, SSH connectivity)
3. Runs quality checks (lint, Prisma validate)
4. Builds the application
5. Creates a database backup (mysqldump)
6. Packages and rsyncs files to the server
7. Creates a new timestamped release directory
8. Symlinks the release as `current`
9. Installs production dependencies on the server
10. Runs Prisma migrations
11. Restarts PM2 process
12. Runs health check against `/api/health`
13. Sends email/Slack notification

### Rollback

```bash
./scripts/rollback.sh
```

The server keeps the last 5 releases. Rollback re-links `current` to the previous release.

### PM2

The `ecosystem.config.js` defines two PM2 apps:

- `partnersandcapital-production` -- Port 3000
- `partnersandcapital-staging` -- Port 3001

```bash
pm2 start ecosystem.config.js --only partnersandcapital-production
pm2 start ecosystem.config.js --only partnersandcapital-staging
pm2 logs partnersandcapital-production
pm2 monit
```

---

## Environment Variables

Create a `.env` file from `.env.example`. Key variables:

| Variable                | Description                             |
| ----------------------- | --------------------------------------- |
| `DATABASE_URL`          | MySQL connection string                 |
| `NEXTAUTH_SECRET`       | Random secret for JWT signing           |
| `NEXTAUTH_URL`          | Application URL (e.g., http://localhost:3000) |
| `ELASTIC_EMAIL_API_KEY` | Elastic Email API key (for transactional emails) |

For deployment, create `.env.staging` and `.env.production` files with additional server variables (`SERVER_USER`, `SERVER_HOST`, `SERVER_PATH`, `SSH_KEY`, `DB_USER`, `DB_PASS`, `DB_NAME`).

---

## Development Phases

### Phase 1: Foundation -- COMPLETED
Next.js scaffolding, Prisma schema, NextAuth, Shadcn/ui + Tailwind 4, route groups with placeholder pages, deploy scripts, PM2 config, seed file, health check, and organization white-label configuration.

### Phase 2: Admin Panel -- Planned
Full CRUD for clients, investments, capital activity, and documents in the admin panel. Data entry workflows for admin sub-roles.

### Phase 3: Client Portal -- Planned
Client-facing dashboard with portfolio overview, performance charts, document vault with upload/download, and capital activity history.

### Phase 4: Advisor Sharing -- Planned
Advisor invitation flow, read-only advisor portal, permission levels (dashboard only, dashboard + documents, specific investment).

### Phase 5: Integrations & Notifications -- Planned
API integration layer (QuickBooks sync), webhook system, email notifications via Elastic Email, activity feed, and deal room updates.

### Phase 6: Hardening & Analytics -- Planned
Production hardening, performance tuning, rate limiting, GA4 analytics integration, comprehensive testing, and security audit.

---

## License

Private. All rights reserved.
