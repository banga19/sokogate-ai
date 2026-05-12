# Sokogate AI - Docker Setup

One-command development and deployment using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.20+
- 4GB+ RAM allocated to Docker

---

## Quick Start (Development)

```bash
# Clone & enter project directory
cd sokogate-ai

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop
docker-compose down
```

Services start:
- **Web app**: http://localhost:4000
- **Database**: PostgreSQL on localhost:5432
- **Adminer** (DB GUI): http://localhost:8080

---

## Services

### 1. Database (PostgreSQL)

```yaml
postgres:
  image: neon/postgres:latest  # Neon's serverless Postgres image
  environment:
    POSTGRES_DB: sokogate_db
    POSTGRES_USER: sokogate_user
    POSTGRES_PASSWORD: sokogate_pass_2026
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

**Connection string:**
```
postgresql://sokogate_user:sokogate_pass_2026@localhost:5432/sokogate_db
```

**Initial schema:** Run migrations on first startup (see Migrations section).

---

### 2. Web Application

```yaml
web:
  build:
    context: ./apps/web
    dockerfile: Dockerfile
  ports:
    - "4000:4000"
  depends_on:
    - postgres
  environment:
    - NODE_ENV=development
    - DATABASE_URL=postgresql://sokogate_user:sokogate_pass_2026@postgres:5432/sokogate_db
    - AUTH_SECRET=${AUTH_SECRET:-change-me-in-production}
    - ADMIN_EMAILS=${ADMIN_EMAILS:-admin@example.com}
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
    # ... other env vars
  volumes:
    - ./apps/web:/app           # Hot reload (dev only)
    - /app/node_modules         # Avoid overwrite
```

**Note:** For production, use multi-stage build and no volume mounts.

---

### 3. Mobile (Expo) - Optional

```yaml
mobile:
  build:
    context: ./apps/mobile
    dockerfile: Dockerfile
  ports:
    - "8081:8081"  # Expo dev server
    - "19000:19000"  # Expo tunnel
  environment:
    - EXPO_PUBLIC_API_URL=http://localhost:4000
```

For mobile testing, use Expo Go app on your device.

---

## Migrations

Database migrations are in `apps/web/src/db/migrations/`.

### Run migrations manually:

```bash
# Into postgres container
docker-compose exec postgres psql -U sokogate_user -d sokogate_db -f /docker-entrypoint-initdb.d/001_schema.sql
```

**Automated:** Add init script to `docker-entrypoint-initdb.d/` (runs automatically on first container start).

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp apps/web/.env.example apps/web/.env
```

Fill in:
- `ANTHROPIC_API_KEY` - Get from console.anthropic.com
- Firebase config (from Firebase console)
- `AUTH_SECRET` - Generate: `openssl rand -base64 32`

---

## Production Deployment

### Build production image:

```bash
docker build -t sokogate-ai/web:latest ./apps/web --target production
```

**Dockerfile (multi-stage):** See `apps/web/Dockerfile.prod`

### Deploy with Compose (production):

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Production considerations:**
- Use secrets management (Docker Swarm secrets or Kubernetes secrets)
- Enable SSL/TLS termination (Traefik/Nginx reverse proxy)
- Use managed Postgres (Neon, not local container)
- Enable Redis for caching
- Set up log aggregation (ELK, Loki)

---

## Troubleshooting

### Database connection refused
- Check postgres is healthy: `docker-compose ps`
- View logs: `docker-compose logs postgres`
- Wait 10-20 seconds for Postgres to start before web app

### Port already in use
Change ports in `docker-compose.yml` to available ones.

### Volume permission errors
```bash
sudo chown -R $UID:$UID ./apps/web/node_modules
```

### Hot reload not working
Ensure you're using `npm run dev` in the web container and volume mounts are set correctly.

---

## Architecture Diagrams

See `docs/ARCHITECTURE.md` for detailed system architecture.

---

*Last updated: 2026-05-12*
