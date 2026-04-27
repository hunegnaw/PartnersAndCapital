#!/bin/bash

#################################################################
# Partners + Capital — Rollback Script
#
# Usage: ./scripts/rollback.sh [release_date|list|latest]
#################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT=${2:-production}

log() { echo -e "${BLUE}[$(date +"%Y-%m-%d %H:%M:%S")]${NC} $1"; }
error() { echo -e "${RED}[$(date +"%Y-%m-%d %H:%M:%S")] ERROR:${NC} $1" >&2; }
success() { echo -e "${GREEN}[$(date +"%Y-%m-%d %H:%M:%S")] SUCCESS:${NC} $1"; }

load_environment() {
    local env_file=".env.$ENVIRONMENT"
    [ ! -f "$env_file" ] && { error "$env_file not found!"; exit 1; }
    set -a; source "$env_file"; set +a

    for var in SERVER_USER SERVER_HOST SERVER_PATH SSH_KEY; do
        [ -z "${!var}" ] && { error "Missing: $var"; exit 1; }
    done
    RELEASES_DIR="$SERVER_PATH/releases"
}

list_releases() {
    log "Available releases:"
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd '$RELEASES_DIR' 2>/dev/null && for r in \$(ls -t); do echo \"  \$r\"; done"
}

perform_rollback() {
    local target="$1"
    local exists=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "[ -d '$RELEASES_DIR/$target' ] && echo yes || echo no")
    [ "$exists" != "yes" ] && { error "Release '$target' not found"; list_releases; exit 1; }

    echo -e "${RED}Rolling back $ENVIRONMENT to: $target${NC}"
    read -p "Type 'rollback' to confirm: " confirm
    [ "$confirm" != "rollback" ] && { log "Cancelled."; exit 0; }

    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "ln -sfn '$RELEASES_DIR/$target' '$SERVER_PATH/current' && pm2 restart partnersandcapital-$ENVIRONMENT --update-env 2>/dev/null && pm2 save 2>/dev/null || echo 'Restart manually'"
    success "Rollback completed"
}

main() {
    TARGET=${1:-}
    load_environment
    case "$TARGET" in
        "") echo "Usage: ./scripts/rollback.sh [list|latest|release_date] [staging|production]"; list_releases ;;
        list) list_releases ;;
        latest)
            PREV=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd '$RELEASES_DIR' && CURR=\$(basename \$(readlink -f '$SERVER_PATH/current')); for r in \$(ls -t); do [ \"\$r\" != \"\$CURR\" ] && echo \$r && break; done")
            [ -z "$PREV" ] && { error "No previous release"; exit 1; }
            perform_rollback "$PREV" ;;
        *) perform_rollback "$TARGET" ;;
    esac
}

main "$@"
