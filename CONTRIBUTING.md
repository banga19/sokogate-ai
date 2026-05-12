# Contributing to Sokogate AI

Thank you for your interest in contributing! This guide will help you get started.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Code Review](#code-review)
8. [Security](#security)

---

## Prerequisites

- **Node.js** v20+
- **npm** v8+
- **PostgreSQL** (local or Docker) – or use `docker-compose up`
- **Git**
- **Expo CLI** (`npm install -g @expo/cli`) for mobile development

---

## Development Setup

### Quick Start (Docker)

```bash
git clone https://github.com/sokogate-ai/sokogate-ai.git
cd sokogate-ai

# Start database + web app
docker-compose up -d

# Open http://localhost:4000
```

### Manual Setup

#### Web App

```bash
cd apps/web

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Start dev server
npm run dev
# → http://localhost:4000
```

#### Mobile App

```bash
cd apps/mobile

# Install dependencies
npm install

# Start Expo
npx expo start

# Scan QR with Expo Go app (Android/iOS)
```

---

## Project Structure

```
sokogate-ai/
├── apps/
│   ├── web/                    # React Router + Hono fullstack app
│   │   ├── src/
│   │   │   ├── app/           # Routes (file-based)
│   │   │   │   ├── api/       # Backend API endpoints
│   │   │   │   └── account/   # Auth pages (signin, reset, etc.)
│   │   │   ├── components/    # React UI components
│   │   │   ├── contexts/      # React contexts (Auth, Theme, etc.)
│   │   │   ├── lib/           # Utilities (firebase, product search)
│   │   │   ├── utils/         # Helper functions
│   │   │   └── server/        # WebSocket pubsub
│   │   ├── build/             # Production build (generated)
│   │   └── sql/               # Database schema & migrations
│   └── mobile/                # Expo/React Native app
├── docs/                      # Architecture & API docs
├── packages/                  # Shared npm packages (monorepo)
│   └── shared/               # Common hooks, utils, types
├── docker-compose.yml         # Dev environment
├── Dockerfile.prod            # Production image
├── .github/workflows/        # CI/CD pipeline
└── SECURITY.md               # Security policy
```

---

## Coding Standards

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Format with Prettier
npm run format

# Pre-commit (auto-runs via Husky)
git commit  # runs lint-staged on staged files
```

**Rules:**
- ESLint: `@react-router` preset + custom rules
- Prettier: Standard config (2-space indent, single quotes, trailing commas)
- TypeScript: Strict mode enabled

### TypeScript

- All new code should be in `.tsx`/`.ts` (not `.js`)
- Define interfaces for props, API responses, data models
- Avoid `any` – use `unknown` or specific types

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(chat): add lead scoring algorithm
fix(api): prevent XSS in message rendering
docs(api): update authentication section
refactor(widget): extract ChatProgress component
security: rotate exposed API keys
```

---

## Testing

### Unit Tests (Vitest)

```bash
cd apps/web
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

Test files: `*.test.tsx` or `*.test.ts` alongside source or in `__tests__/`.

### Integration Tests (TODO)

Postman/Newman collection in `docs/postman/` for API endpoint testing.

### E2E Tests (TODO)

Playwright tests for chat flow, lead capture, admin CRUD.

---

## Pull Request Process

1. **Fork** the repo (if external) or create feature branch
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make changes** with clear, atomic commits
4. **Run tests & lint** locally:
   ```bash
   npm run typecheck && npm run lint && npm run test
   ```
5. **Push** to your fork/origin:
   ```bash
   git push origin feat/your-feature-name
   ```
6. **Open a Pull Request** against `main`

**PR Template:** (GitHub template exists – fill all sections)

- [ ] Tests added/updated
- [ ] Docs updated (if API changed)
- [ ] Lint & typecheck pass
- [ ] Security reviewed (if auth/input handling changed)

---

## Code Review

All PRs require at least **1 approving review**.

Reviewers check for:
- Correctness & bugs
- Security implications
- Performance impact
- Test coverage
- Documentation updates
- Backward compatibility

---

## Security

If you discover a security vulnerability, **DO NOT** open a public issue.

See [SECURITY.md](SECURITY.md) for responsible disclosure process.

### Security Best Practices

- Never commit `.env` or secrets
- Always validate & sanitize user input
- Use parameterized SQL queries only
- Follow principle of least privilege
- Log sensitive actions (with user ID, not plaintext data)

---

## Database Migrations

Migrations are in `apps/web/src/db/migrations/`. They run automatically on app startup (if not already applied).

To add a migration:
1. Create new `.sql` file with descriptive name
2. Increment prefix (e.g., `004_add_contacts_table.sql`)
3. Ensure idempotent (use `CREATE TABLE IF NOT EXISTS`)

To run manually:
```bash
# Via psql
psql $DATABASE_URL -f migration.sql

# Or inside container
docker-compose exec postgres psql -U sokogate_user -d sokogate_db -f src/db/migrations/004_*.sql
```

---

## Troubleshooting

### Docker won't start
- Ensure Docker Desktop is running
- Increase allocated RAM to 4GB minimum
- Check for port conflicts (4000, 5432, 8080)

### Migration errors
- Verify `DATABASE_URL` in `.env`
- Check Postgres is running
- Read error logs: `docker-compose logs postgres`

### Hot reload not working
- Volume mounts may be broken on Windows/WSL2
- Try rebuilding: `docker-compose build --no-cache web`

---

## Getting Help

- **Documentation:** `/docs/`
- **Issues:** https://github.com/sokogate-ai/sokogate-ai/issues
- **Discussions:** https://github.com/sokogate-ai/sokogate-ai/discussions
- **Chat:** #support on Slack (invite via README)

---

**Happy coding!** 🚀
