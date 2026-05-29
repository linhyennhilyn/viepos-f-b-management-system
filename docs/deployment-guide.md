# ViePOS — Deployment Guide

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (recommend 20 LTS)
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 14+ or Docker Desktop
- Redis 7+ or Docker

### 1. Clone & Install

```bash
git clone https://github.com/plateau/viepos.git
cd viepos
pnpm install
```

### 2. Environment Variables

Create `.env.local` (git-ignored):

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/viepos_dev"

# Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars-here"
BETTER_AUTH_URL="http://localhost:3000"

# Payment (SePay VietQR)
SEPAY_API_KEY="your-sepay-api-key"
SEPAY_API_URL="https://api.sepay.vn/v4"  # or sandbox URL
SEPAY_MERCHANT_ACCOUNT="your-merchant-account-number"
SEPAY_WEBHOOK_SECRET="your-webhook-secret-key"

# Cache & Queue
REDIS_URL="redis://localhost:6379"

# Realtime (choose one)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="ap1"
# OR for Soketi (self-hosted):
# SOKETI_ENDPOINT="http://localhost:6001"
# SOKETI_APP_KEY="your-soketi-key"
# SOKETI_APP_SECRET="your-soketi-secret"

# Email (transactional)
SMTP_HOST="smtp.resend.com"  # or SendGrid
SMTP_PORT="587"
SMTP_USER="resend"
SMTP_PASS="your-resend-api-key"
SMTP_FROM="noreply@viepos.example.com"

# Printer (optional — WebUSB fallback in browser)
PRINTER_SERVICE_URL="https://print-api.example.com"  # if cloud print

# Environment
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="ViePOS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Start Local Services (Docker Compose)

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: viepos_dev
      POSTGRES_USER: viepos
      POSTGRES_PASSWORD: viepos_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Optional: Soketi (realtime, self-hosted alternative to Pusher)
  soketi:
    image: quay.io/soketi/soketi:latest
    ports:
      - "6001:6001"
    environment:
      SOKETI_DEBUG: "0"
      SOKETI_METRICS_ENABLED: "0"
      SOKETI_APP_MANAGER_DRIVER: "array"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_ID: "default-app"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_KEY: "default-key"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_SECRET: "default-secret"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_ENABLE_CLIENT_MESSAGES: "true"

volumes:
  postgres_data:
  redis_data:
```

**Start services:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Database Setup

```bash
# Create schema & tables
pnpm exec prisma migrate dev --name init

# (Optional) Seed test data
pnpm exec prisma db seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Server runs at `http://localhost:3000`

### 6. Test the Setup

```bash
# Unit tests
pnpm test

# E2E tests (requires server running)
pnpm test:e2e

# Linting & type check
pnpm lint
pnpm type-check
```

---

## Production Deployment

### Option A: Cloud-Hosted (Vercel + Neon + Upstash + Pusher)

**Recommended for:** Minimal ops overhead, global CDN, automatic scaling.

#### 1. Vercel Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (links to GitHub)
vercel
```

**Vercel config (vercel.json):**
```json
{
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

#### 2. PostgreSQL (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string: `postgresql://user:password@host/db`
4. Add to Vercel env var: `DATABASE_URL`

#### 3. Redis (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy connection string: `redis://user:password@host:port`
4. Add to Vercel env var: `REDIS_URL`

#### 4. Realtime (Pusher)

1. Create account at [pusher.com](https://pusher.com)
2. Create app (select VN region if available)
3. Copy credentials to Vercel env vars:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER` (e.g., `ap1`)

#### 5. Secrets Management (Vercel)

```bash
# Add secrets via CLI
vercel env add BETTER_AUTH_SECRET
vercel env add SEPAY_API_KEY
vercel env add SEPAY_WEBHOOK_SECRET
vercel env add SMTP_PASS
```

**Or via Vercel dashboard:** Settings → Environment Variables

#### 6. Database Migration

```bash
# Run migrations on production
vercel env pull  # pulls prod env vars
pnpm exec prisma migrate deploy
```

#### 7. Deploy

```bash
vercel --prod
```

**Post-deploy:**
- Verify at `https://<project>.vercel.app`
- Check logs: `vercel logs`
- Monitor performance: Vercel Analytics dashboard

---

### Option B: Self-Hosted (Docker + VPS + Caddy)

**Recommended for:** Cost control, data residency (keep data in Vietnam), custom integrations.

#### 1. VPS Setup

Target: Ubuntu 22.04 LTS on DigitalOcean, Linode, or local server.

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install git
apt install -y git

# Create app user
useradd -m -s /bin/bash viepos
usermod -aG docker viepos
su - viepos
```

#### 2. Application Setup

```bash
# Clone repo
git clone https://github.com/plateau/viepos.git
cd viepos

# Create .env (use production values)
cat > .env.production << 'EOF'
DATABASE_URL="postgresql://viepos:secure_password@postgres:5432/viepos"
REDIS_URL="redis://redis:6379"
BETTER_AUTH_SECRET="your-32-char-secret-key-here"
BETTER_AUTH_URL="https://your-domain.com"
SEPAY_API_KEY="prod-sepay-key"
SEPAY_WEBHOOK_SECRET="prod-webhook-secret"
SOKETI_ENDPOINT="http://soketi:6001"  # internal Docker network
SOKETI_APP_KEY="prod-soketi-key"
SOKETI_APP_SECRET="prod-soketi-secret"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
EOF

# Secure .env (remove read permissions from others)
chmod 600 .env.production
```

#### 3. Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://viepos:secure_password@postgres:5432/viepos
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - soketi
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: viepos
      POSTGRES_USER: viepos
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U viepos"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass your_redis_password
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  soketi:
    image: quay.io/soketi/soketi:latest
    restart: always
    environment:
      SOKETI_DEBUG: "0"
      SOKETI_METRICS_ENABLED: "1"
      SOKETI_APP_MANAGER_DRIVER: "array"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_ID: "prod-app"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_KEY: "prod-key"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_SECRET: "prod-secret"
      SOKETI_APP_MANAGER_ARRAY_APPS_0_ENABLE_CLIENT_MESSAGES: "true"
    ports:
      - "6001:6001"

  caddy:
    image: caddy:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:
```

#### 4. Reverse Proxy (Caddy)

Create `Caddyfile`:

```
your-domain.com {
  reverse_proxy http://app:3000 {
    header_up X-Forwarded-For {http.request.remote.host}
    header_up X-Forwarded-Proto {http.request.proto}
  }

  # Enable gzip compression
  encode gzip

  # Security headers
  header / {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "no-referrer-when-downgrade"
  }
}
```

#### 5. SSL Certificates

Caddy auto-provisions Let's Encrypt certificates. Ensure DNS points to server IP first:

```bash
# DNS record
your-domain.com  A  your-server-ip
```

#### 6. Deploy

```bash
# Build images & start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Database migrations
docker-compose -f docker-compose.prod.yml exec app pnpm exec prisma migrate deploy
```

#### 7. Backups

**Automated PostgreSQL backup (daily to S3):**

```bash
# Create backup script: backup.sh
#!/bin/bash
BACKUP_FILE="/backups/viepos_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U viepos viepos > $BACKUP_FILE
gzip $BACKUP_FILE
# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://your-backup-bucket/
```

**Add to crontab:**
```bash
0 2 * * * /root/viepos/backup.sh  # Run daily at 2 AM
```

---

## Environment Variables Reference

### Required for all environments

```bash
DATABASE_URL            # PostgreSQL connection string
BETTER_AUTH_SECRET      # Min 32 chars, used for session encryption
BETTER_AUTH_URL         # Your application URL
```

### Required for Phase 2+ (Payments)

```bash
SEPAY_API_KEY           # SePay API key
SEPAY_WEBHOOK_SECRET    # For webhook HMAC validation
```

### Required for Phase 3+ (Realtime)

```bash
# If using Pusher (managed)
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER

# If using Soketi (self-hosted)
SOKETI_ENDPOINT         # e.g., http://localhost:6001
SOKETI_APP_KEY
SOKETI_APP_SECRET
```

### Optional

```bash
REDIS_URL               # Redis connection (default: localhost:6379)
SMTP_HOST, SMTP_PORT    # Transactional email
NODE_ENV                # development / production
NEXT_PUBLIC_APP_URL     # Public app URL (for Figma embeds, etc.)
PRINTER_SERVICE_URL     # Cloud print service (if not WebUSB)
```

### Security: Never commit to git
- `.env` (local dev only)
- `.env.production` (prod secrets)
- `.env.local` (temporary overrides)

**Use `.env.example` as template:**
```bash
# .env.example (commit this, no secrets)
DATABASE_URL="postgresql://user:password@localhost:5432/viepos_dev"
BETTER_AUTH_SECRET="replace-with-32-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: viepos_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

---

## Monitoring & Logging

### Error Tracking (Sentry)

1. Create account at [sentry.io](https://sentry.io)
2. Create Next.js project
3. Install SDK: `pnpm add @sentry/nextjs`
4. Configure in `next.config.ts`

### Performance Monitoring

- **Vercel Analytics:** Automatic (if using Vercel)
- **Custom metrics:** Log to stdout → aggregated by hosting platform
- **Slow queries:** Prisma logs to console, check production logs

### Database Backups

- **Neon:** Automatic daily snapshots, 7-day retention
- **Self-hosted:** Manual backups daily to S3 (see backup script above)

---

## Rollback Strategy

### Vercel
```bash
vercel rollback
```

### Self-hosted
```bash
# Revert to previous git commit
git revert <commit-sha>
git push

# Redeploy
docker-compose -f docker-compose.prod.yml up -d --build

# Rollback database (if schema changed)
pnpm exec prisma migrate resolve --rolled-back <migration-name>
pnpm exec prisma migrate deploy
```

---

## Secrets Rotation

### BETTER_AUTH_SECRET
1. Generate new 32-char secret
2. Update in env vars
3. Existing sessions expire (users re-login)
4. No data migration needed

### SEPAY_WEBHOOK_SECRET
1. Generate new secret in SePay dashboard
2. Update env var
3. Deploy immediately
4. Old webhooks will fail validation (retry by SePay)

### Database password
1. Update in PostgreSQL
2. Update CONNECTION_URL env var
3. Redeploy

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on PostgreSQL | Ensure `docker-compose up -d postgres` is running |
| Vercel deploy fails | Check `vercel logs` for details; common: missing env vars |
| SePay webhook not received | Verify endpoint is HTTPS, firewall allows POST, webhook URL registered in SePay dashboard |
| Printer not detected | WebUSB requires HTTPS; fallback to cloud print |
| Realtime not syncing | Check Soketi/Pusher connection; verify API key correct |

---

## Unresolved Questions

1. **Backup retention:** How many daily backups to keep? (Recommend 30 days)
2. **Disaster recovery SLA:** If data lost, can we recover from backup? (RTO/RPO targets?)
3. **Database failover:** Should we use read replicas for high availability? (Deferred to Phase 5)
4. **Load testing:** What's the expected concurrent user load? (Plan for 50 staff sessions per location)
