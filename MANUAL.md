# Partners + Capital -- Instruction Manual

This manual covers setup, administration, and usage of the Partners + Capital investor portal. As the product is built in phases, this document will be expanded with detailed feature guides for each phase.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Guide](#admin-guide)
3. [Default Credentials](#default-credentials)
4. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
5. [Deployment Basics](#deployment-basics)
6. [Troubleshooting](#troubleshooting)
7. [Feature Roadmap](#feature-roadmap)

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

### Navigating the Admin Panel

The admin panel is located under the `/admin` route group. In Phase 1, all admin pages are placeholder scaffolds. They will become fully functional in Phase 2. The admin panel includes the following sections:

| Route                  | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `/admin`               | Admin dashboard -- overview and quick stats          |
| `/admin/clients`       | Manage client (LP) accounts and profiles             |
| `/admin/investments`   | Manage investments, funds, and asset classes          |
| `/admin/documents`     | Upload and manage documents (K1s, reports, PPMs)     |
| `/admin/activity`      | Manage activity feed posts and deal room updates     |
| `/admin/audit-log`     | View audit trail of all system actions               |
| `/admin/api-keys`      | Create and manage API keys for external integrations |
| `/admin/settings`      | Organization settings (branding, colors, 2FA policy) |

### Admin Roles

The system supports multiple admin access levels:

- **SUPER_ADMIN** -- Full system access. Can manage all settings, users, and data.
- **ADMIN** -- Administrative access with sub-roles:
  - **FULL_ACCESS** -- Same as SUPER_ADMIN but cannot modify system-level settings.
  - **READ_ONLY** -- Can view all admin panels but cannot create, edit, or delete data.
  - **DATA_ENTRY** -- Can create and edit investments, contributions, and distributions but cannot manage users or settings.

### Client Portal (Investor View)

The client portal is located under the root route group. In Phase 1, all client pages are placeholder scaffolds. They will become functional in Phase 3. Portal sections include:

| Route                | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `/dashboard`         | Portfolio overview with performance summary    |
| `/investments`       | Detailed investment holdings and performance   |
| `/documents`         | Secure document vault (K1s, reports, etc.)     |
| `/capital-activity`  | Contribution and distribution history          |
| `/advisors`          | Manage advisor access to your portfolio data   |
| `/settings`          | Account settings and 2FA configuration         |

### Advisor Portal

Advisors have read-only access to their clients' data. The advisor portal is at `/advisor/dashboard` and will be built out in Phase 4.

---

## Default Credentials

After running the seed script, the following admin account is available:

| Field    | Value                          |
| -------- | ------------------------------ |
| Email    | `admin@partnersandcapital.com` |
| Password | `admin123!`                    |
| Role     | SUPER_ADMIN                    |

**Important**: Change this password immediately after your first login. This is a default credential intended for initial setup only. In a production environment, using the default password is a security risk.

---

## Two-Factor Authentication (2FA)

Partners + Capital supports TOTP-based two-factor authentication (Time-based One-Time Password), compatible with authenticator apps such as Google Authenticator, Authy, 1Password, and Microsoft Authenticator.

### Organization 2FA Policy

The organization-level 2FA policy (configured in `/admin/settings` once Phase 2 is built) controls how 2FA is enforced across the platform:

- **Optional** (default) -- Users can choose whether to enable 2FA on their account.
- **Mandatory** -- All users must set up 2FA before they can access the portal. Users who have not configured 2FA will be prompted to do so on login.
- **Disabled** -- 2FA is turned off across the platform.

### Setting Up 2FA (User Flow)

Once the settings page is functional (Phase 3):

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
9. Restarts the PM2 process
10. Verifies the deployment with a health check to `/api/health`
11. Sends a notification (email and/or Slack, if configured)

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

---

## Feature Roadmap

Phase 1 covers the foundation only. Detailed feature guides will be added to this manual as each phase is completed.

| Phase | Name                        | Status    |
| ----- | --------------------------- | --------- |
| 1     | Foundation                  | Completed |
| 2     | Admin Panel                 | Planned   |
| 3     | Client Portal               | Planned   |
| 4     | Advisor Sharing             | Planned   |
| 5     | Integrations & Notifications | Planned  |
| 6     | Hardening & Analytics       | Planned   |

As each phase is built, this manual will be updated with:
- Step-by-step guides for new features
- Screenshots and workflow descriptions
- Configuration options and best practices
- API documentation (Phase 5)
