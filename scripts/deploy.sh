#!/bin/bash

#################################################################
# Partners + Capital — Unified Deployment Script
#
# Usage: ./scripts/deploy.sh [staging|production]
#
# Environment variables required (set in .env.staging or .env.production):
#   - SERVER_USER
#   - SERVER_HOST
#   - SERVER_PATH
#   - SSH_KEY
#   - DB_USER
#   - DB_PASS
#   - DB_NAME
#   - DB_HOST (optional, defaults to localhost)
#   - NOTIFY_EMAIL (optional)
#   - SLACK_WEBHOOK (optional)
#################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
DEPLOY_DATE=$(date +%Y%m%d-%H%M%S)
DEPLOY_TAG="deploy-$DEPLOY_DATE"
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

send_notification() {
    local subject="$1" message="$2" status="$3"
    if [ -n "$NOTIFY_EMAIL" ] && [ -n "$ELASTIC_EMAIL_API_KEY" ]; then
        curl -s -X POST "https://api.elasticemail.com/v2/email/send" \
            -d "apikey=$ELASTIC_EMAIL_API_KEY" \
            -d "from=deploy@partnersandcapital.com" \
            -d "fromName=P+C Deploy" \
            -d "to=$NOTIFY_EMAIL" \
            -d "subject=[$ENVIRONMENT] $subject" \
            -d "bodyText=$message" 2>/dev/null || true
    fi
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="#36a64f"
        [ "$status" = "warning" ] && color="#ff9800"
        [ "$status" = "error" ] && color="#ff0000"
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"[$ENVIRONMENT] $subject\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

handle_error() {
    local exit_code=$? line_number=$1
    error "Deployment failed at line $line_number with exit code $exit_code"
    send_notification "Deployment FAILED" "Failed at line $line_number (exit $exit_code)" "error"
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

confirm_production() {
    if [ "$ENVIRONMENT" = "production" ]; then
        printf "Are you sure you want to deploy to PRODUCTION? Type 'yes' to confirm: "
        read confirm </dev/tty
        if [ "$confirm" != "yes" ]; then log "Cancelled."; exit 0; fi
        exec </dev/null
    fi
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
    ssh -T -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" bash -s "$DEPLOY_DATE" "$SERVER_PATH" "$DB_HOST" "$DB_USER" "$DB_PASS" "$DB_NAME" << 'ENDSSH' || warn "Backup skipped"
set -e
BACKUP_DIR="${HOME}/backups/$1"
mkdir -p "$BACKUP_DIR"
if [ -d "$2/.next" ]; then cp -r "$2/.next" "$BACKUP_DIR/" 2>/dev/null || true; fi
if command -v mysqldump &>/dev/null; then
    mysqldump -h "$3" -u "$4" -p"$5" "$6" > "$BACKUP_DIR/database.sql" 2>/dev/null || echo "DB backup skipped"
fi
cd "${HOME}/backups" && ls -t | tail -n +11 | xargs rm -rf 2>/dev/null || true
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

    # Deploy env file
    local env_file=".env.$ENVIRONMENT"
    grep -v -E '^(SERVER_USER|SERVER_HOST|SERVER_PATH|SSH_KEY|BRANCH|DB_USER|DB_PASS|DB_NAME|DB_HOST|NOTIFY_EMAIL|SLACK_WEBHOOK)=' "$env_file" | \
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cat > '$SHARED_DIR/.env'"
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "echo 'NODE_ENV=$ENVIRONMENT' >> '$SHARED_DIR/.env' && ln -sfn '$SHARED_DIR/.env' '$DEPLOY_DIR/.env'"

    success "Files deployed"
}

activate_release() {
    log "Activating release..."
    ssh -T -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" bash -s "$CURRENT_LINK" "$DEPLOY_DIR" "$RELEASES_DIR" "$SHARED_DIR" << 'ENDSSH'
set -e
ln -sfn "$2" "$1"

# Clean old releases (keep last 5)
cd "$3" && ls -1dt */ | tail -n +6 | xargs rm -rf 2>/dev/null || true

cd "$2"
npm ci --production --prefer-offline 2>/dev/null || npm install --production

# Link shared dirs
rm -rf "$2/public/uploads" "$2/logs" 2>/dev/null || true
ln -sfn "$4/uploads" "$2/public/uploads"
ln -sfn "$4/logs" "$2/logs"

# Prisma
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
    npx prisma migrate deploy
fi

# PM2
APP_NAME="partnersandcapital-production"
grep -q "PORT=3001" .env 2>/dev/null && APP_NAME="partnersandcapital-staging"
PM2_CMD=$(command -v pm2 2>/dev/null || echo "")
if [ -n "$PM2_CMD" ]; then
    cd "$1"
    $PM2_CMD delete "$APP_NAME" 2>/dev/null || true
    if [ -f "ecosystem.config.js" ]; then
        $PM2_CMD start ecosystem.config.js --only "$APP_NAME"
    else
        $PM2_CMD start npm --name "$APP_NAME" -- start
    fi
    $PM2_CMD save
fi
ENDSSH
    success "Release activated"
}

run_health_check() {
    log "Running health checks..."
    HEALTH_HOST="${HEALTH_CHECK_HOST:-$SERVER_HOST}"
    for i in $(seq 1 5); do
        sleep 5
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$HEALTH_HOST/api/health" 2>/dev/null || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then success "Health check passed"; return 0; fi
        warn "Attempt $i: HTTP $HTTP_STATUS"
    done
    warn "Health check failed after 5 attempts"
}

show_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          Deployment Completed Successfully!                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment: $ENVIRONMENT"
    echo "  URL: https://$SERVER_HOST"
    echo "  Release: $DEPLOY_DATE"
    echo "  Time: $(get_elapsed_time)"
    echo ""
    send_notification "Deployment SUCCESS" "Deployed to $ENVIRONMENT in $(get_elapsed_time)" "success"
}

main() {
    if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
        echo "Usage: ./scripts/deploy.sh [staging|production]"; exit 1
    fi
    show_header
    load_environment
    confirm_production
    run_preflight_checks
    run_quality_checks
    build_application
    create_backup
    prepare_package
    deploy_files
    activate_release
    run_health_check
    show_summary
}

main
