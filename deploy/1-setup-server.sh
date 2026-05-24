#!/bin/bash
# StraightShot Overhead — VPS Initial Setup Script
# Run this once on a fresh Ubuntu 24.04 VPS as root
# Usage: bash 1-setup-server.sh

set -e
echo "=== StraightShot VPS Setup ==="

# 1. Update system
echo ">> Updating system..."
apt-get update -y && apt-get upgrade -y

# 2. Install Node.js 22 via NVM
echo ">> Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
nvm alias default 22
echo "Node version: $(node -v)"

# 3. Install PM2
echo ">> Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# 4. Install Nginx
echo ">> Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# 5. Install Certbot for SSL
echo ">> Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 6. Install Git
apt-get install -y git

# 7. Create app directory
mkdir -p /var/www/straightshot-service

echo ""
echo "=== Server setup complete! ==="
echo "Next: run 2-deploy.sh to upload and start the app."
