# Partners + Capital -- Instruction Manual

This manual covers setup, administration, and usage of the Partners + Capital investor portal.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Guide](#admin-guide)
3. [Client Portal Guide](#client-portal-guide)
4. [Support Ticket System](#support-ticket-system)
5. [Advisor Access](#advisor-access)
6. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
7. [Default Credentials](#default-credentials)
8. [Deployment Basics](#deployment-basics)
9. [Production Seeding](#production-seeding)
10. [Troubleshooting](#troubleshooting)
11. [Feature Roadmap](#feature-roadmap)

---

## Getting Started

### System Requirements

- **Node.js**: 20 or later
- **MySQL**: 8.0+ (or MariaDB 10.6+)
- **npm**: Included with Node.js
- **PM2**: Required for production process management (`npm install -g pm2`)

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone git@github.com:hunegnaw/PartnersAndCapital.git partnersandcapital.com
   cd partnersandcapital.com
   ```

2. **Create the environment file**

   ```bash
   cp .env.example .env
   ```

3. **Configure the environment**

   Open `.env` in a text editor and set the following values:

   - `DATABASE_URL` -- Your MySQL connection string in the format:
     ```
     mysql://username:password@hostname:3306/database_name
     ```
   - `NEXTAUTH_SECRET` -- A random string used for signing JWTs. Generate one with:
     ```bash
     openssl rand -base64 32
     ```
   - `NEXTAUTH_URL` -- The URL where the application will run (e.g., `http://localhost:3000` for local development).

4. **Run the setup script**

   ```bash
   ./scripts/setup.sh
   ```

   This script will:
   - Install all npm dependencies
   - Generate the Prisma client
   - Run database migrations to create all tables
   - Seed the database with a default admin user, organization, and asset classes
   - Create necessary upload directories

   If you prefer to run steps individually:

   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Admin Guide

### Logging In

1. Navigate to `/login` in your browser.
2. Enter the admin email and password (see [Default Credentials](#default-credentials) below).
3. If two-factor authentication is enabled on the account, you will be prompted for a TOTP code from your authenticator app.
4. After successful login, admins are redirected to the admin panel at `/admin`.

### Admin Layout

The admin panel features a light sidebar with grouped navigation sections:

**Header:** "PARTNERS + CAPITAL" branding with an "Admin Portal" gold badge, plus links to Audit Log, Settings, and the admin avatar.

**Sidebar sections:**

- **MANAGE:** Clients (with count), Investments (with count), Documents (with count), Advisors (with count), Activity Feed, Support (with open ticket count)
- **SYSTEM:** Admin Users, Audit Log, Settings

### Client Management (Admin Dashboard)

The admin landing page at `/admin` is the Client Management view. It provides:

- **3 summary cards:** Total Clients (with new this month), Active Portals (with pending setup count), AUM Total (with deal count)
- **Audit status bar:** Shows the latest audit log action with a green indicator
- **Search and filters:** Full-text search, status filter (All/Active/Inactive/Suspended), role filter (All/Client/Advisor)
- **Export CSV:** Download a CSV of the filtered client list
- **Tabs:** All Clients, Pending Setup, Active, Archived
- **Client table:** Displays name, email, company, total invested, current value, last login, status, and action buttons (View/Edit/Archive)

### Admin Routes

| Route                  | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `/admin`               | Client Management dashboard with stats and table     |
| `/admin/investments`   | Manage investments, funds, and asset classes          |
| `/admin/documents`     | Upload and manage documents (K-1s, reports, PPMs)    |
| `/admin/activity`      | Manage activity feed posts and deal room updates     |
| `/admin/support`       | View and respond to client support tickets           |
| `/admin/audit-log`     | View audit trail of all system actions                |
| `/admin/api-keys`      | Create and manage API keys for external integrations |
| `/admin/settings`      | Organization settings (branding, colors, 2FA policy) |

### Admin Roles

The system supports multiple admin access levels:

- **SUPER_ADMIN** -- Full system access. Can manage all settings, users, and data.
- **ADMIN** -- Administrative access with sub-roles:
  - **FULL_ACCESS** -- Same as SUPER_ADMIN but cannot modify system-level settings.
  - **READ_ONLY** -- Can view all admin panels but cannot create, edit, or delete data.
  - **DATA_ENTRY** -- Can create and edit investments, contributions, and distributions but cannot manage users or settings.

---

## Client Portal Guide

### Portal Layout

The client portal features a warm cream background with a light sidebar and navy header:

**Header:** "PARTNERS + CAPITAL" in uppercase, with links to Documents, Advisor Access, Notifications (bell icon), and the user avatar.

**Sidebar sections:**

- **INVESTOR:** Dashboard, Portfolio, Documents, Distributions, Advisor Access
- **ACCOUNT:** Settings, Support, Log Out

Active navigation items are highlighted with a gold left border and gold text color.

### Dashboard

The dashboard at `/dashboard` has two states:

**Full State (active investor):**
- Welcome message with last updated timestamp
- **4 KPI cards:** Total Invested (with investment count), Current Value (with gain amount), Total Return (with Net IRR), Cash Distributed (YTD)
- **Allocation section:** Horizontal bars showing portfolio allocation by asset class with color coding (Oil & Gas = amber, Real Estate = navy, Private Credit = dark gray, Specialty = light gray)
- **Portfolio Growth chart:** Line chart showing value over time with an amber/gold line
- **Active Investments table:** Deal name, invested amount (compact format like $250K), return percentage, status badge
- **Documents section:** Recent documents with title, type, investment name, and Download link
- **Recent Activity section:** Timeline with amber bullet dots, event descriptions, and dates

**Empty State (new investor, no investments):**
- Navy hero banner with welcome message, user initials avatar, and "Contact your advisor" link
- **3 Getting Started cards:**
  1. Portal access -- green checkmark, "Your account is active and secure"
  2. First investment confirmed -- "Once your subscription is processed, your dashboard will populate"
  3. Invite your advisor -- "Give your CPA or financial advisor read-only access"
- Two dashed-border placeholder cards for Portfolio and Documents

### Portfolio / Investments

The portfolio page at `/investments` lists all active investment positions. Clicking an investment opens the detail page.

### Investment Detail

The investment detail page at `/investments/[id]` features:

- **Navy header section:** Breadcrumb navigation, investment name, asset class and location, status badge
- **Tab navigation:** Overview, Updates, Documents, Disclosures
- **5 KPI cards:** Invested (with date), Current Value (with gain), Total Return (with Net IRR), Cash Distributed (with payment count), Holding Period (with target)
- **Two-column Overview layout:**
  - Left: Description paragraph and metadata table (asset class, location, investment date, target hold, target return, distribution cadence, fund status)
  - Right: Value Over Time line chart and Latest Update card
- **Updates section:** Grouped by month/year with title and description
- **Documents section:** List with title, type, date, and download link
- **Disclaimer box:** Standard private investment risk disclosure

### Documents

The documents page at `/documents` includes:

- **CPA access banner:** If an advisor has tax/document access, shows their name, permission level, and expiration date with a "Manage access" link
- **Left sidebar:**
  - CATEGORIES: All Documents, Tax Documents, Quarterly Reports, Legal & Agreements, Capital Notices (with counts)
  - BY INVESTMENT: Each investment name with document count
- **Document cards:** File type badge (PDF = red, DOC = blue), title, upload date, file size, "Visible to CPA" indicator, type tags, "New" badge for recently uploaded documents, Download button
- **Filters:** Year, type, and investment dropdowns

### Distributions

The distributions page at `/capital-activity` shows contribution and distribution history for each investment position.

### Settings

The settings page at `/settings` allows users to update their profile information and manage two-factor authentication.

---

## Support Ticket System

### Client Support (Portal)

Clients can submit and track support tickets at `/support`:

- **New Ticket form:** Subject, Category (Account, Documents, Investments, Technical, Other), and Message fields
- **Your Tickets list:** Shows all submitted tickets with status badges (Open, In Progress, Resolved, Closed), creation date, category, and reply count
- **Ticket Detail dialog:** Click any ticket to view the full conversation thread with replies from staff (highlighted in blue) and the ability to reply (unless the ticket is Closed)

### Admin Support Management

Admins manage all support tickets at `/admin/support`:

- **Filters:** Filter by status (Open, In Progress, Resolved, Closed) and priority (High, Medium, Low)
- **Ticket list:** Shows all tickets with client name, status badge, priority badge, category, and reply count
- **Ticket Detail dialog:** View the full thread, change the ticket status, and post admin replies (shown with a "Staff" badge)

---

## Advisor Access

### Overview

Investors can share read-only portfolio access with their CPAs, financial advisors, or family office representatives. The advisor access page is at `/advisors`.

### Inviting an Advisor

The invite form collects:
- **Advisor name** and **email address**
- **Advisor type:** CPA / Tax Advisor, Financial Advisor, Family Office, Attorney, Other
- **Access level** (4 tiers):
  1. **Dashboard only** -- Portfolio summary, allocation, and performance numbers. No documents.
  2. **Dashboard + Tax documents** -- Includes K-1s and 1099s. No legal agreements or reports. Best for CPAs.
  3. **Dashboard + All documents** -- Full document vault access. Recommended for financial advisors and family offices.
  4. **Specific investment only** -- Restrict to one deal. Useful for deal-specific attorneys or co-investors.
- **Access start date** (defaults to today)
- **Expiration date** (when access automatically expires)

Upon submission, the advisor receives a secure email invitation.

### Managing Active Advisors

Each active advisor card displays:
- Name, type, firm, email, and initials avatar
- Status badge: "Active" (green) or "Invite pending" (amber)
- **Access tags:** Descriptive pills showing what the advisor can see (Dashboard, K-1s, 1099s, Reports, Legal docs, All documents)
- Expiration date and last viewed date
- Action buttons: Edit and Revoke (for active), Resend and Cancel (for pending invitations)

### Access Log

Below the active advisors, an access log shows advisor-related activity with timestamps and event descriptions.

---

## Two-Factor Authentication (2FA)

Partners + Capital supports TOTP-based two-factor authentication (Time-based One-Time Password), compatible with authenticator apps such as Google Authenticator, Authy, 1Password, and Microsoft Authenticator.

### Organization 2FA Policy

The organization-level 2FA policy (configured in `/admin/settings`) controls how 2FA is enforced across the platform:

- **Optional** (default) -- Users can choose whether to enable 2FA on their account.
- **Mandatory** -- All users must set up 2FA before they can access the portal. Users who have not configured 2FA will be prompted to do so on login.
- **Disabled** -- 2FA is turned off across the platform.

### Setting Up 2FA (User Flow)

1. Navigate to `/settings` (or `/admin/settings` for admins).
2. Find the "Two-Factor Authentication" section.
3. Click "Enable 2FA."
4. A QR code will be displayed. Scan it with your authenticator app.
5. Enter the 6-digit code from your authenticator app to verify.
6. 2FA is now active on your account. You will be prompted for a code on each login.

### Technical Details

- TOTP secrets are stored encrypted in the `TwoFactorSecret` table.
- The `twoFactorEnabled` flag on the User model tracks whether 2FA is active.
- The `twoFactorVerified` flag confirms the user has successfully completed 2FA setup.
- QR codes are generated server-side using the `qrcode` library.
- TOTP generation and verification is handled by the `otpauth` library.

---

## Default Credentials

After running the seed script, the following accounts are available in development:

| Account          | Email                          | Password     | Role        |
| ---------------- | ------------------------------ | ------------ | ----------- |
| Admin            | `admin@partnersandcapital.com` | `admin123!`  | SUPER_ADMIN |
| Client (full)    | `david.morgan@example.com`     | `client123!` | CLIENT      |
| Client           | `sandra.okafor@example.com`    | `client123!` | CLIENT      |
| Client (empty)   | `james.whitfield@example.com`  | `client123!` | CLIENT      |
| Client           | `rachel.tran@example.com`      | `client123!` | CLIENT      |

- **David Morgan** -- Has 3 active investments with positions, documents, and activity. Shows the full dashboard state.
- **James Whitfield** -- Has no investments. Shows the empty/onboarding dashboard state.

**Important**: Change all passwords immediately after your first login. These are default credentials intended for development and initial setup only.

---

## Deployment Basics

### Environments

The project supports two deployment environments:

- **Staging** -- For testing before production. Runs on port 3001.
- **Production** -- Live environment. Runs on port 3000.

### Environment Files

Each environment requires its own env file:

- `.env.staging` -- Staging server configuration
- `.env.production` -- Production server configuration

These files contain both application variables (DATABASE_URL, NEXTAUTH_SECRET, etc.) and deployment variables (SERVER_USER, SERVER_HOST, SSH_KEY, etc.).

### Deploying

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires main/master branch, clean working directory)
./scripts/deploy.sh production
```

The deploy script performs the full pipeline automatically:

1. Validates the environment and checks SSH connectivity
2. Runs linting and Prisma schema validation
3. Builds the Next.js application
4. Backs up the database on the server (mysqldump)
5. Transfers files via rsync to a new timestamped release directory
6. Symlinks the new release as `current`
7. Installs production dependencies
8. Runs database migrations
9. Runs the idempotent seed (creates organization and admin user if missing)
10. Restarts the PM2 process
11. Verifies the deployment with a health check to `/api/health`
12. Sends a notification (email and/or Slack, if configured)

### Rolling Back

If a deployment causes issues:

```bash
./scripts/rollback.sh
```

The server retains the last 5 releases. Rollback switches the `current` symlink to the previous release and restarts PM2.

### PM2 Management

Common PM2 commands for managing the application on the server:

```bash
pm2 status                                    # View all running processes
pm2 logs partnersandcapital-production        # View live logs
pm2 restart partnersandcapital-production     # Restart the app
pm2 monit                                     # Real-time monitoring dashboard
```

### Health Check

The application exposes a health check endpoint at:

```
GET /api/health
```

Returns HTTP 200 when the application is running correctly. This endpoint is used by the deploy script and can be used by external monitoring services.

---

## Production Seeding

The seed script is production-aware. When `NODE_ENV=production`, it only creates:

- The **Organization** record (Partners + Capital branding)
- The **Admin user** (admin@partnersandcapital.com)
- The **Asset Classes** (Oil & Gas, Real Estate, Private Credit, Specialty)

It does **not** create any demo client accounts, investments, positions, documents, advisors, or other test data in production. All client data in production is entered manually through the admin panel.

The seed is idempotent -- it checks for existing records before creating and can be re-run safely at any time (including during deployments).

---

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify `DATABASE_URL` in your `.env` file is correct.
- Ensure MySQL is running and the database exists.
- Check that the database user has the correct permissions.

**"Prisma migration failed"**
- Run `npx prisma migrate dev` manually to see detailed error output.
- Ensure the database user has CREATE, ALTER, and DROP permissions.

**"NEXTAUTH_SECRET is not set"**
- Generate a secret: `openssl rand -base64 32`
- Add it to your `.env` file.

**"Port 3000 already in use"**
- Another process is using the port. Find it with `lsof -i :3000` and stop it.
- Or change the port: `PORT=3001 npm run dev`

**Setup script fails on permissions**
- Make scripts executable: `chmod +x scripts/*.sh`

**"RSA public key is not available client side"**
- This is a MySQL/MariaDB connection issue. The Prisma adapter is configured with `allowPublicKeyRetrieval: true` to handle this. If you see this error, ensure you are using the latest `src/lib/prisma.ts` and `prisma/seed.ts`.

**"pool timeout: failed to retrieve a connection"**
- Usually caused by the RSA key issue above, or by too many concurrent connections. Restart the MySQL server and retry.

---

## Feature Roadmap

| Phase | Name                         | Status      |
| ----- | ---------------------------- | ----------- |
| 1     | Foundation                   | Completed   |
| 2     | Admin Panel + CRUD           | Completed   |
| 3     | Client Portal + Mockup UI   | Completed   |
| 4     | Advisor Sharing              | Completed   |
| 5     | Integrations & Notifications | Planned     |
| 6     | Hardening & Analytics        | Planned     |

### Completed Features

- Full admin CRUD for clients, investments, documents, activity feed
- Client portal with dashboard (full + empty states), portfolio, documents, distributions
- Design-aligned UI matching all 6 mockup screenshots
- Advisor access with 4-tier permission levels and access logging
- Support ticket system (client submission + admin management)
- CSV export for admin client list
- Two-factor authentication (TOTP)
- Audit logging for all admin actions
- Production-aware database seeding
