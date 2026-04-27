#!/bin/bash

#################################################################
# Partners + Capital — First-Time Setup Script
#
# Run this after cloning the repo on a new machine or server.
# Usage: ./scripts/setup.sh
#################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[SETUP]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Partners + Capital — First-Time Setup                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for .env
if [ ! -f ".env" ]; then
    log "Creating .env from .env.example..."
    cp .env.example .env
    warn "Please edit .env with your database credentials and secrets!"
    warn "  DATABASE_URL, NEXTAUTH_SECRET, etc."
    echo ""
fi

# Install dependencies
log "Installing dependencies..."
npm install

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Run migrations
log "Running database migrations..."
npx prisma migrate dev 2>/dev/null || {
    warn "Migration failed. Make sure DATABASE_URL is configured in .env"
    warn "Run manually: npx prisma migrate dev"
}

# Seed database
log "Seeding database..."
npx prisma db seed 2>/dev/null || {
    warn "Seed failed. Run manually after configuring database: npx prisma db seed"
}

# Create upload directories
log "Creating upload directories..."
mkdir -p public/uploads

# Make scripts executable
chmod +x scripts/*.sh

echo ""
success "Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit .env with your database credentials"
echo "  2. Run: npx prisma migrate dev"
echo "  3. Run: npx prisma db seed"
echo "  4. Run: npm run dev"
echo ""
echo "  Default admin login:"
echo "    Email: admin@partnersandcapital.com"
echo "    Password: admin123!"
echo ""
