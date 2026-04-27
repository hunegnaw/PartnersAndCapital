#!/bin/bash

#################################################################
# Partners + Capital — Database Migration Script
#
# Usage: ./scripts/db-migrate.sh [development|staging|production|reset|seed|status]
#################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-development}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log() { echo -e "${BLUE}[$(date +"%Y-%m-%d %H:%M:%S")]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +"%Y-%m-%d %H:%M:%S")] SUCCESS:${NC} $1"; }

case $ENVIRONMENT in
    development|dev)
        log "Running development migration..."
        npx prisma migrate dev
        npx prisma generate
        success "Done" ;;
    staging)
        [ -f ".env.staging" ] && export $(cat .env.staging | grep -v '^#' | xargs)
        npx prisma migrate deploy && npx prisma generate
        success "Done" ;;
    production|prod)
        echo -e "${RED}WARNING: PRODUCTION database migration!${NC}"
        read -p "Type 'yes' to confirm: " confirm
        [ "$confirm" != "yes" ] && { log "Cancelled."; exit 0; }
        [ -f ".env.production" ] && export $(cat .env.production | grep -v '^#' | xargs)
        npx prisma migrate deploy && npx prisma generate
        success "Done" ;;
    reset)
        echo -e "${RED}WARNING: This will DELETE all data!${NC}"
        read -p "Type 'reset' to confirm: " confirm
        [ "$confirm" != "reset" ] && { log "Cancelled."; exit 0; }
        npx prisma migrate reset
        success "Done" ;;
    seed) npx prisma db seed; success "Seeded" ;;
    studio) npx prisma studio ;;
    status) npx prisma migrate status ;;
    *) echo "Usage: ./scripts/db-migrate.sh [development|staging|production|reset|seed|status]"; exit 1 ;;
esac
