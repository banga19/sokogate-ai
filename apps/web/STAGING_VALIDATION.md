# Staging Deployment & Validation Guide
## Sokogate AI Chatbot Analytics Implementation

---

## Phase 1: Database Migration

**Target:** Staging database

```bash
# 1. Connect to staging database
psql $STAGING_DATABASE_URL

# 2. Run schema migration
\i sql/analytics-schema.sql

# 3. Verify tables created
\dt analytics_events
\dt lead_score_history
\dt chat_session_metrics

# 4. Verify indexes
\di idx_analytics_*

# 5. Check views
SELECT * FROM daily_analytics_summary LIMIT 5;
SELECT * FROM daily_conversion_funnel LIMIT 5;
```

**Expected output:**
```
Table "public.analytics_events"
 id | event_type | visitor_id | event_data | created_at
(0 rows)
```

If errors: Check PostgreSQL version (>= 12 recommended), check RLS restrictions.

---

## Phase 2: Code Deployment

**Prerequisites:**
- Node.js >= 20
- `DATABASE_URL` configured in staging environment
- `ANTHROPIC_API_KEY` set

```bash
# 1. Build the app
cd sokogate-ai/apps/web
npm ci  # if package.json changed
npm run build

# 2. Deploy to staging (adjust to your deployment method)
# Example for cPanel/PM2:
git add .
git commit -m "feat: add analytics endpoint and i18n refactor"
git push staging main

# Or if using Vercel/Netlify: push to main branch (auto-deploy)
```

**Verify:**
- Build completes without errors
- No new warnings (warnings are ok, errors are not)
- Server starts successfully

---

## Phase 3: Local Staging Test (if accessible)

If you have local/staging instance running:

```bash
# Run the automated test script
node test-analytics.js http://localhost:3000

# Expected output:
# === Analytics Endpoint Test ===
# Test 1: Reject empty payload ✅
# Test 2: Reject non-array events ✅
# Test 3: Accept valid single event ✅
# Test 4: Batch 10 events ✅
# Test 5: Reject oversized batch ✅
# Test 6: Summary endpoint accessible ✅
# === RESULTS ===
# Passed: 6/6
# 🟢 All analytics tests passed!
```

---

## Phase 4: Remote Staging Validation

Run the commands below against your staging URL:

### 4.1 Health Check
```bash
curl -s https://staging.sokogate.com/api/analytics/log -X POST -H "Content-Type: application/json" -d '{}' | jq .
# Expected: {"error":"Invalid payload: events array required"}
```

### 4.2 Ingest Test Event
```bash
curl -s -X POST https://staging.sokogate.com/api/analytics/log \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "staging_validation",
        "visitorId": "vis_staging_check",
        "timestamp": 1747632000000,
        "stage": "testing"
      }
    ]
  }' | jq .
```

Expected: `{"success":true,"received":1,"timestamp":...}`

### 4.3 Verify in Database
```bash
psql $STAGING_DATABASE_URL -c \
  "SELECT * FROM analytics_events WHERE visitor_id = 'vis_staging_check' ORDER BY id DESC LIMIT 1;"
```

Expected output includes:
- `event_type = 'staging_validation'`
- `visitor_id = 'vis_staging_check'`
- `event_data` contains `{"stage":"testing","timestamp":1747632000000,"type":"staging_validation","visitorId":"vis_staging_check"}`
- `created_at` ~ current time

### 4.4 Summary Endpoint
```bash
curl -s "https://staging.sokogate.com/api/analytics/summary?days=1" | jq '.summary'
```

Expected output includes:
```json
{
  "total_events": 1,
  "unique_visitors": 1,
  "by_event_type": [{"event_type":"staging_validation","count":1}],
  "daily_trends": [{"date":"2026-05-12","count":1}],
  "funnel": { ... },
  "top_categories": []
}
```

### 4.5 Multi-Event Batch
```bash
# Generate and send 20 events
node -e "
const events = Array.from({length:20}, (_,i) => ({
  type: i<10 ? 'message_sent' : 'stage_advanced',
  visitorId: 'vis_batch_validation',
  timestamp: Date.now() - (20-i)*1000,
  length: 15+i,
  fromStage: 'greeting',
  toStage: 'needs'
}));
require('fs').writeFileSync('/tmp/batch.json', JSON.stringify({events}));
" && \
curl -s -X POST https://staging.sokogate.com/api/analytics/log \
  -H "Content-Type: application/json" \
  -d @/tmp/batch.json | jq . && \
psql $STAGING_DATABASE_URL -c \
  "SELECT COUNT(*) as total, event_type, COUNT(*) as cnt FROM analytics_events WHERE visitor_id = 'vis_batch_validation' GROUP BY event_type ORDER BY cnt DESC;"
```

Expected: `total = 20`, split between `message_sent` and `stage_advanced`.

---

## Phase 5: Frontend Integration Check

### 5.1 Load Staging Homepage
- Open `https://staging.sokogate.com` in browser
- Open DevTools → Network tab
- Filter by `analytics`

### 5.2 Trigger Chat Events
- Click chat toggle
- Send 2-3 messages
- Complete lead capture flow (or abort at consent)
- Close chat

### 5.3 Verify Network Requests
- Look for POSTs to `/api/analytics/log`
- Status 200 on each
- Request payload contains events array with correct structure
- Response body: `{"success":true,"received":N,"timestamp":...}`

### 5.4 Database Cross-Check
While browser is still open (same visitor session):

```bash
# Find your visitor ID from localStorage in browser console:
# > localStorage.getItem('sokogate_visitor_id')
# returns "vis_abc123..."

# Then query DB:
psql $STAGING_DATABASE_URL -c \
  "SELECT event_type, COUNT(*) FROM analytics_events WHERE visitor_id = 'vis_abc123...' GROUP BY event_type;"
```

Expected to see `chat_started`, `message_sent`, possibly `lead_captured`, etc.

---

## Phase 6: Performance Validation

### 6.1 Load Test (Optional)
```bash
# Install wrk: https://github.com/wg/wrk
# Generate payload file with 10 events
node -e "
const events = Array.from({length:10}, (_,i) => ({
  type: 'load_test',
  visitorId: 'vis_load_' + i,
  timestamp: Date.now() + i,
}));
console.log(JSON.stringify({events}));
" > /tmp/analytics-payload.json

# Run load test: 1000 requests, 50 concurrent
wrk -t12 -c50 -d30s -s analytics-post.lua https://staging.sokogate.com/api/analytics/log

# Where analytics-post.lua contains:
#   wrk.method = "POST"
#   wrk.headers["Content-Type"] = "application/json"
#   wrk.body = readfile("/tmp/analytics-payload.json")
```

**Acceptable:**
- p50 < 50ms
- p95 < 200ms
- Error rate < 1%

### 6.2 Database Impact
Monitor during load test:
```sql
SELECT
  COUNT(*) as events_per_sec,
  pg_size_pretty(pg_relation_size('analytics_events')) as table_size
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '1 minute';
```

Check index usage:
```sql
SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE 'idx_analytics_%';
```

---

## Phase 7: Monitoring & Alerts

### 7.1 Application Logs
```bash
# Tail staging logs
tail -f /var/log/sokogate/staging.log | grep analytics

# Watch for errors
grep "Analytics.*error" /var/log/sokogate/staging.log
```

Should see occasional errors only if network issues; no stack traces expected.

### 7.2 Database Bloat
```sql
-- Check table size growth rate
SELECT
  pg_size_pretty(pg_relation_size('analytics_events')) as size,
  COUNT(*) as rows
FROM analytics_events;
```

Run daily. If growing > 10MB/day, plan partitioning/archival strategy.

### 7.3 Set Up Alerts (if using monitoring)

Create alerts for:
1. **High error rate**: `rate(http_server_errors_total{endpoint="/api/analytics/log"}[5m]) > 0.01`
2. **Slow queries**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{endpoint="/api/analytics/log"}[5m])) > 0.2`
3. **Table growth**: `pg_relation_size('analytics_events') > 1GB` (adjust threshold)

---

## Phase 8: Rollback Procedures

If issues detected:

### Code Rollback
```bash
cd sokogate-ai/apps/web
git revert HEAD --no-edit
git push staging main
# Wait for deploy
```

### Database Disable
If analytics causing DB load:
```sql
-- Option A: Drop table (data loss, but stops load)
DROP TABLE IF EXISTS analytics_events CASCADE;

-- Option B: Disable writes via app (quickest)
# Edit ChatWidget.jsx to comment out analytics.track() calls, redeploy
```

### Feature Flag (recommended for future)
Wrap analytics in env var:
```js
if (process.env.ENABLE_ANALYTICS === 'true') {
  analytics.track(...);
}
```

Then toggle off via env and reload.

---

## Expected Baseline Metrics (After 24h)

| Metric | Target | How to Check |
|--------|--------|--------------|
| Events ingested | > 100 | `SELECT COUNT(*) FROM analytics_events` |
| Unique visitors | > 50 | `SELECT COUNT(DISTINCT visitor_id) FROM analytics_events` |
| Lead capture events | > 5 | `SELECT COUNT(*) FROM analytics_events WHERE event_type='lead_captured'` |
| API 5xx rate | < 0.1% | Monitoring/logs |
| Avg response time | < 100ms | `SELECT AVG(EXTRACT(EPOCH FROM (response_time))) FROM server_logs WHERE endpoint='/api/analytics/log'` |

---

## Sign-Off Checklist

- [ ] Database schema applied without errors
- [ ] Staging build succeeds
- [ ] Analytics endpoint returns 200 for valid payloads
- [ ] Events visible in `analytics_events` table
- [ ] Chatbot frontend sends real events (Network tab shows POSTs)
- [ ] Summary endpoint returns aggregated data
- [ ] No errors in server logs related to analytics
- [ ] Performance: < 200ms p95 latency for batch ingest
- [ ] Database growth rate acceptable (< 1MB/hour typical)
- [ ] Monitoring alerts configured (optional)
- [ ] Rollback plan documented and tested (optional)

---

Once all checks pass, promote to production following the same procedure with production database backup.

**Document Owner:** Kilo (Full-Stack Engineer)  
**Last Updated:** 2026-05-12
