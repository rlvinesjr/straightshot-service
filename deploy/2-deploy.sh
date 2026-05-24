#!/bin/bash
# StraightShot Overhead — Deploy Script
# Run this on the VPS after setup, inside /var/www/straightshot-service
# Usage: bash 2-deploy.sh

set -e
echo "=== Deploying StraightShot Service App ==="

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Install dependencies
echo ">> Installing dependencies..."
npm install --production=false

# Generate Prisma client
echo ">> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ">> Running database migrations..."
npx prisma migrate deploy

# Build Next.js app
echo ">> Building app..."
npm run build

# Start or restart with PM2
echo ">> Starting app with PM2..."
pm2 delete straightshot-service 2>/dev/null || true
pm2 start npm --name "straightshot-service" -- start
pm2 save

echo ""
echo "=== Deployment complete! App running on port 3000 ==="
