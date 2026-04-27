#!/bin/bash

#################################################################
# Partners + Capital — Unified Deployment Script
#
# Deploys to Cloudways PHP stack with Node.js via PM2 + .htaccess proxy
#
# Usage: ./scripts/deploy.sh [staging|production]
#
# Environment variables required (set in .env.staging or .env.production):
#   - SERVER_USER, SERVER_HOST, SERVER_PATH, SSH_KEY
#   - DB_USER, DB_PASS, DB_NAME
#   - DB_HOST (optional, defaults to localhost)
#   - HEALTH_CHECK_HOST (optional, for health check URL)
#################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
DEPLOY_DATE=$(date +%Y%m%d-%H%M%S)
START_TIME=$(date +%s)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT=${1:-staging}

log() { echo -e "${BLUE}[$TIMESTAMP]${NC} $1"; }
error() { echo -e "${RED}[$TIMESTAMP] ERROR:${NC} $1" >&2; }
success() { echo -e "${GREEN}[$TIMESTAMP] SUCCESS:${NC} $1"; }
warn() { echo -e "${YELLOW}[$TIMESTAMP] WARNING:${NC} $1"; }

get_elapsed_time() {
    local end_time=$(date +%s)
    local elapsed=$((end_time - START_TIME))
    echo "$((elapsed / 60))m $((elapsed % 60))s"
}

handle_error() {
    local exit_code=$? line_number=$1
    error "Deployment failed at line $line_number with exit code $exit_code"
    exit $exit_code
}
trap 'handle_error $LINENO' ERR

load_environment() {
    local env_file=".env.$ENVIRONMENT"
    if [ ! -f "$env_file" ]; then
        error "Environment file $env_file not found!"
        exit 1
    fi
    set -a; source "$env_file"; set +a

    local required_vars=("SERVER_USER" "SERVER_HOST" "SERVER_PATH" "SSH_KEY" "DB_USER" "DB_PASS" "DB_NAME")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then error "Missing: $var"; exit 1; fi
    done

    DB_HOST="${DB_HOST:-localhost}"

    # Cloudways structure: releases/shared/current sit inside public_html
    RELEASES_DIR="$SERVER_PATH/releases"
    CURRENT_LINK="$SERVER_PATH/current"
    DEPLOY_DIR="$RELEASES_DIR/$DEPLOY_DATE"
    SHARED_DIR="$SERVER_PATH/shared"
}

show_header() {
    echo ""
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     Partners + Capital — PRODUCTION Deployment              ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║     Partners + Capital — Staging Deployment                 ║${NC}"
        echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
}

confirm_deploy() {
    echo ""
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}You are about to deploy to PRODUCTION.${NC}"
    else
        echo -e "${YELLOW}You are about to deploy to STAGING.${NC}"
    fi
    echo ""
    echo "  Server:  $SERVER_USER@$SERVER_HOST"
    echo "  Path:    $SERVER_PATH"
    echo "  DB:      $DB_NAME"
    echo ""
    printf "Deploy to ${ENVIRONMENT}? (y/n): "
    read confirm </dev/tty
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log "Cancelled."
        exit 0
    fi
    echo ""
}

run_preflight_checks() {
    log "Running pre-flight checks..."
    if [ ! -d ".git" ]; then error "Not a git repository."; exit 1; fi

    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
            error "Production must deploy from main/master. Current: $CURRENT_BRANCH"; exit 1
        fi
        if [ -n "$(git status --porcelain)" ]; then
            error "Uncommitted changes. Clean working directory required for production."; exit 1
        fi
        git fetch origin
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || echo "")
        if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
            error "Not up to date with origin/$CURRENT_BRANCH"; exit 1
        fi
    fi
    if [ ! -d "node_modules" ]; then npm ci; fi

    log "Testing SSH connection..."
    ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "echo 'OK'" 2>/dev/null || {
        error "SSH connection failed"; exit 1
    }
    success "Pre-flight checks passed"
}

run_quality_checks() {
    log "Running quality checks..."
    npm ci --prefer-offline
    npm run lint || { [ "$ENVIRONMENT" = "production" ] && exit 1 || warn "Lint errors, continuing..."; }

    if [ -f "prisma/schema.prisma" ]; then
        npx prisma validate || { error "Prisma schema invalid"; exit 1; }
    fi
    success "Quality checks passed"
}

build_application() {
    log "Building application..."
    NODE_ENV=production npm run build
    [ ! -d ".next" ] && { error "Build failed"; exit 1; }
    success "Build completed"
}

create_backup() {
    log "Creating backup..."
    ssh -T -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" bash -s "$DEPLOY_DATE" "$CURRENT_LINK" "$DB_HOST" "$DB_USER" "$DB_PASS" "$DB_NAME" << 'ENDSSH' || warn "Backup skipped"
set -e
BACKUP_DIR="/home/master/backups/$1"
mkdir -p "$BACKUP_DIR"

# Backup current release .next if it exists
CURRENT_RELEASE=$(readlink -f "$2" 2>/dev/null || echo "")
if [ -n "$CURRENT_RELEASE" ] && [ -d "$CURRENT_RELEASE/.next" ]; then
    cp "$CURRENT_RELEASE/package.json" "$BACKUP_DIR/" 2>/dev/null || true
fi

# Database backup
if command -v mysqldump &>/dev/null; then
    mysqldump -h "$3" -u "$4" -p"$5" "$6" > "$BACKUP_DIR/database.sql" 2>/dev/null || echo "DB backup skipped"
fi

# Clean old backups (keep last 10)
cd /home/master/backups && ls -t | tail -n +11 | xargs rm -rf 2>/dev/null || true
echo "Backup done"
ENDSSH
    success "Backup completed"
}

prepare_package() {
    log "Preparing package..."
    LOCAL_PACKAGE=$(mktemp -d)
    trap "rm -rf $LOCAL_PACKAGE" EXIT

    mkdir -p "$LOCAL_PACKAGE/.next"
    find .next -mindepth 1 -maxdepth 1 ! -name 'cache' -exec cp -r {} "$LOCAL_PACKAGE/.next/" \;
    if [ -d "public" ]; then
        mkdir -p "$LOCAL_PACKAGE/public"
        find public -mindepth 1 -maxdepth 1 ! -name 'uploads' -exec cp -r {} "$LOCAL_PACKAGE/public/" \;
    fi
    cp package.json "$LOCAL_PACKAGE/"
    [ -f package-lock.json ] && cp package-lock.json "$LOCAL_PACKAGE/"
    [ -f next.config.ts ] && cp next.config.ts "$LOCAL_PACKAGE/"
    [ -f ecosystem.config.js ] && cp ecosystem.config.js "$LOCAL_PACKAGE/"
    [ -f prisma.config.ts ] && cp prisma.config.ts "$LOCAL_PACKAGE/"
    [ -d "prisma" ] && cp -r prisma "$LOCAL_PACKAGE/"

    success "Package prepared"
}

deploy_files() {
    log "Deploying files..."
    ssh -T -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p '$DEPLOY_DIR' '$SHARED_DIR/uploads' '$SHARED_DIR/logs'"

    set +e
    rsync -avz --delete --omit-dir-times \
        --exclude 'node_modules' --exclude '.git' --exclude '.env*' --exclude '*.log' --exclude '.DS_Store' --exclude 'public/uploads' \
        -e "ssh -i $SSH_KEY" "$LOCAL_PACKAGE/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/"
    RSYNC_EXIT=$?
    set -e
    [ $RSYNC_EXIT -ne 0 ] && [ $RSYNC_EXIT -ne 23 ] && { error "rsync failed ($RSYNC_EXIT)"; exit 1; }

    # Deploy env file (filter out deploy-only vars)
    local env_file=".env.$ENVIRONMENT"
    grep -v -E '^(SERVER_USER|SERVER_HOST|SERVER_PATH|SSH_KEY|BRANCH|DB_USER|DB_PASS|DB_NAME|DB_HOST|NOTIFY_EMAIL|SLACK_WEBHOOK|HEALTH_CHECK_HOST)=' "$env_file" | \
    grep -v '^#' | grep -v '^$' | \
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cat > '$SHARED_DIR/.env'"

    # Always set NODE_ENV=production (Next.js requires it for built output)
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "echo 'NODE_ENV=production' >> '$SHARED_DIR/.env' && ln -sfn '$SHARED_DIR/.env' '$DEPLOY_DIR/.env'"

    success "Files deployed"
}

create_htaccess() {
    log "Creating .htaccess for Apache reverse proxy..."

    # Production uses port 3000, staging uses 3001
    local PORT=4000
    [ "$ENVIRONMENT" = "staging" ] && PORT=40001

    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cat > '$SERVER_PATH/.htaccess'" << HTACCESS
DirectoryIndex disabled
RewriteEngine On
RewriteBase /
RewriteRule ^(.*)?$ http://127.0.0.1:$PORT/\$1 [P,L]
HTACCESS

    # Remove default Cloudways index.php if present
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "rm -f '$SERVER_PATH/index.php' 2>/dev/null || true"

    success ".htaccess created (proxying to port $PORT)"
}

activate_release() {
    log "Activating release..."
    ssh -T -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" bash -s "$CURRENT_LINK" "$DEPLOY_DIR" "$RELEASES_DIR" "$SHARED_DIR" "$ENVIRONMENT" << 'ENDSSH'
set -e
CURRENT_LINK="$1"
DEPLOY_DIR="$2"
RELEASES_DIR="$3"
SHARED_DIR="$4"
ENVIRONMENT="$5"

# Add pm2 to PATH (installed at /home/master/.npm-global/bin)
export PATH="/home/master/bin/npm/lib/node_modules/bin:/home/master/.npm-global/bin:$PATH"

# Update current symlink
ln -sfn "$DEPLOY_DIR" "$CURRENT_LINK"
echo "Symlink: $CURRENT_LINK -> $DEPLOY_DIR"

# Clean old releases (keep last 5)
cd "$RELEASES_DIR" && ls -1dt */ 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Install dependencies
cd "$DEPLOY_DIR"
echo "Installing production dependencies..."
npm ci --production --prefer-offline 2>/dev/null || npm install --production

# Link shared directories
rm -rf "$DEPLOY_DIR/public/uploads" "$DEPLOY_DIR/logs" 2>/dev/null || true
mkdir -p "$DEPLOY_DIR/public"
ln -sfn "$SHARED_DIR/uploads" "$DEPLOY_DIR/public/uploads"
ln -sfn "$SHARED_DIR/logs" "$DEPLOY_DIR/logs"
echo "Shared dirs linked"

# Prisma generate + migrate
if [ -f "prisma/schema.prisma" ]; then
    echo "Running Prisma generate..."
    npx prisma generate

    echo "Running database migrations..."
    # Auto-recover from failed migrations
    MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)
    if echo "$MIGRATE_STATUS" | grep -q "failed"; then
        echo "Recovering failed migrations..."
        echo "$MIGRATE_STATUS" | grep "failed" | sed -n 's/.*`\([^`]*\)`.*/\1/p' | while read migration; do
            [ -n "$migration" ] && npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || true
        done
    fi
    npx prisma migrate deploy
    echo "Migrations applied"
fi

# Create logs dir for PM2
mkdir -p "$DEPLOY_DIR/logs"

# Determine app name and restart with PM2
APP_NAME="partnersandcapital-production"
[ "$ENVIRONMENT" = "staging" ] && APP_NAME="partnersandcapital-staging"
echo "PM2 app: $APP_NAME"

PM2_CMD=$(command -v pm2 2>/dev/null || echo "")
if [ -z "$PM2_CMD" ] && [ -x "/home/master/bin/npm/lib/node_modules/bin/pm2" ]; then
    PM2_CMD="/home/master/bin/npm/lib/node_modules/bin/pm2"
elif [ -z "$PM2_CMD" ] && [ -x "/home/master/.npm-global/bin/pm2" ]; then
    PM2_CMD="/home/master/.npm-global/bin/pm2"
fi

if [ -n "$PM2_CMD" ]; then
    echo "Found PM2 at: $PM2_CMD"
    cd "$(readlink -f $CURRENT_LINK)"
    $PM2_CMD delete "$APP_NAME" 2>/dev/null || true
    if [ -f "ecosystem.config.js" ]; then
        $PM2_CMD start ecosystem.config.js --only "$APP_NAME"
    else
        $PM2_CMD start npm --name "$APP_NAME" -- start
    fi
    $PM2_CMD save
    echo "PM2 started"
    $PM2_CMD list
else
    echo "WARNING: PM2 not found. Install with: npm install -g pm2"
fi
ENDSSH
    success "Release activated"
}

run_health_check() {
    log "Running health checks..."
    HEALTH_HOST="${HEALTH_CHECK_HOST:-$SERVER_HOST}"
    for i in $(seq 1 8); do
        sleep 5
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$HEALTH_HOST/api/health" 2>/dev/null || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then success "Health check passed (HTTP 200)"; return 0; fi
        warn "Attempt $i/8: HTTP $HTTP_STATUS"
    done
    warn "Health check did not return 200 after 8 attempts. Check manually: https://$HEALTH_HOST/api/health"
}

play_done_sound() {
    # Try multiple methods to play a completion sound (macOS / Linux)
    if command -v afplay &>/dev/null; then
        # macOS — use system sounds
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
    elif command -v paplay &>/dev/null; then
        paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &
    elif command -v aplay &>/dev/null; then
        aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null &
    else
        # Fallback: terminal bell
        printf '\a'
    fi
}

show_summary() {
    HEALTH_HOST="${HEALTH_CHECK_HOST:-$SERVER_HOST}"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          Deployment Completed Successfully!                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment: $ENVIRONMENT"
    echo "  URL: https://$HEALTH_HOST"
    echo "  Release: $DEPLOY_DATE"
    echo "  Time: $(get_elapsed_time)"
    echo ""
    echo "  Rollback: ./scripts/rollback.sh latest $ENVIRONMENT"
    echo ""

    play_done_sound
}

main() {
    if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
        echo "Usage: ./scripts/deploy.sh [staging|production]"; exit 1
    fi
    show_header
    load_environment
    confirm_deploy
    run_preflight_checks
    run_quality_checks
    build_application
    create_backup
    prepare_package
    deploy_files
    create_htaccess
    activate_release
    run_health_check
    show_summary
}

main
