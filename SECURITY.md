# Security Policy

## Reporting Security Issues

We take security seriously. If you discover a security vulnerability, please report it privately.

**DO NOT** open a public GitHub issue for security issues.

### Contact

Email: security@sokogate.com (example)
Or use GitHub Security Advisory: https://github.com/sokogate-ai/sokogate-ai/security/advisories

We will respond within 48 hours and aim to fix within 90 days.

---

## Security Measures Implemented

### Code Hardening (May 2026)

1. **XSS Prevention**
   - All AI output sanitized via DOMPurify
   - Strict CSP headers (script-src 'self' 'unsafe-inline')
   - HTML allowlist: `br`, `strong`, `a` only

2. **Authentication & Authorization**
   - JWT-based sessions via @auth/core (Firebase Auth)
   - Admin-only routes protected by middleware
   - `ADMIN_EMAILS` env var restricts admin actions

3. **Rate Limiting**
   - Chat endpoint: 30 req/min per session, 60 req/min per IP
   - Sliding window algorithm, in-memory store (upgradeable to Redis)

4. **SQL Injection Prevention**
   - Parameterized queries via `pg` tagged templates
   - No string concatenation in queries

5. **SSL/TLS**
   - Database connections use `rejectUnauthorized: true` in production
   - HTTPS enforced via HSTS header in production

6. **Input Validation**
   - Email regex validation
   - Content-Length limits (10MB JSON, 50MB multipart)
   - Message count limits (max 50 per request)

7. **Secret Management**
   - All API keys in environment variables (no hardcoded secrets)
   - `.env` in `.gitignore`
   - `.env.example` provided with placeholders

---

## Audit Trail

| Date | Finding | Status | Resolution |
|------|---------|--------|------------|
| 2026-05-12 | Hardcoded Firebase credentials | Fixed | Moved to env vars |
| 2026-05-12 | XSS in chat rendering | Fixed | DOMPurify sanitization |
| 2026-05-12 | Unauthenticated admin CRUD | Fixed | JWT middleware |
| 2026-05-12 | No rate limiting on chat | Fixed | Per-IP & per-session limits |
| 2026-05-12 | Insecure DB SSL config | Fixed | rejectUnauthorized: true |
| 2026-05-12 | Password reset token bug | Fixed | Email included in lookup |

---

## Security Best Practices for Developers

1. **Never commit secrets** - Use `.env` and `.gitignore`
2. **Validate all inputs** - Both client & server
3. **Sanitize outputs** - Especially AI-generated content
4. **Use parameterized queries** - Never string-format SQL
5. **Apply least privilege** - Only admins can write to knowledge/settings
6. **Log responsibly** - Never log passwords, API keys, full URLs
7. **Keep deps updated** - Run `npm audit` weekly

---

## Security Checklist for Releases

- [ ] Rotate any exposed API keys
- [ ] Review audit logs for anomalies
- [ ] Verify rate limiting is active
- [ ] Test CSP headers with browser devtools
- [ ] Ensure SSL certificates valid
- [ ] Check database access logs
- [ ] Run `npm audit` (no high/critical vulnerabilities)
- [ ] Pre-commit hooks active (husky + lint-staged)
- [ ] .env not in git (verify `.gitignore`)

---

## Incident Response

If a security breach is detected:

1. **Contain** - Disable affected endpoints, rotate keys
2. **Investigate** - Review logs, determine scope
3. **Notify** - Inform users if PII compromised
4. **Remediate** - Deploy patch
5. **Post-mortem** - Document learnings

---

*Last updated: 2026-05-12*
