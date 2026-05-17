# Add Lead Database Update Fix

## Issues Fixed

### 1. **Email Update Failure** ✅ FIXED
**File:** [src/app/api/leads/update-email/route.js](sokogate-ai/apps/web/src/app/api/leads/update-email/route.js#L29)

**Problem:** The code was checking `updateResult.rows.length` but `sql` returns the rows array directly.
```javascript
// ❌ BEFORE
const updateResult = await sql`UPDATE leads SET email = ... RETURNING *`;
if (updateResult.rows.length === 0) { // ERROR: updateResult is already an array, not a result object
```

**Solution:** Changed to check array length directly:
```javascript
// ✅ AFTER
if (updateResult.length === 0) { // Correct: updateResult is the rows array
  const updatedLead = updateResult[0]; // Correct array access
```

---

### 2. **Silent Lead Creation Failures** ✅ FIXED
**File:** [src/app/api/chat/route.js](sokogate-ai/apps/web/src/app/api/chat/route.js#L747)

**Problem:** When the database transaction failed, the error was logged but NOT returned to the client.
```javascript
// ❌ BEFORE
} catch (e) {
  console.error("Lead save failed:", e); // Only logs, doesn't return error
  // Falls through to next section = silent failure
}
```

**Solution:** Added proper error response:
```javascript
// ✅ AFTER
} catch (e) {
  console.error("Lead save failed:", e.message);
  return Response.json({
    error: "Failed to save lead to database",
    leadCaptured: false,
    content: aiContent.replace(/\|LEAD_DATA:.*?\|/s, "").trim(),
    stage: currentStage,
    debugError: e.message
  }, { status: 500 }); // Return error to client immediately
}
```

---

### 3. **No Database Connection Diagnostics** ✅ ADDED
**File:** [src/app/api/health/route.js](sokogate-ai/apps/web/src/app/api/health/route.js) (NEW)

**Solution:** Created a health check endpoint to diagnose database issues.

---

## Diagnostic Commands

### Test Database Connection
```bash
# 1. Verify DATABASE_URL is set
echo $DATABASE_URL

# 2. Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT 1"

# 3. Count existing leads
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM leads"

# 4. Check for recent leads
psql "$DATABASE_URL" -c "SELECT id, name, email, created_at FROM leads ORDER BY created_at DESC LIMIT 5"
```

### Test API Health Endpoint (NEW)
```bash
# Check database connectivity through API
curl http://localhost:3000/api/health
```

Expected response if working:
```json
{
  "timestamp": "2026-05-17T...",
  "database": {
    "status": "connected",
    "currentTime": "2026-05-17T...",
    "leadCount": 42
  },
  "errors": []
}
```

### Test Lead Creation
```bash
# Manual lead creation via POST
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "score": "High",
    "category": "Electronics",
    "source": "manual"
  }'
```

---

## Root Causes Addressed

| Issue | Root Cause | Status |
|-------|-----------|--------|
| Email updates failing | Wrong property access on result object | ✅ FIXED |
| Leads not being saved to DB | Silent exception handling | ✅ FIXED |
| No way to diagnose DB issues | No health check endpoint | ✅ ADDED |
| Transaction failures invisible | No error response | ✅ FIXED |

---

## Testing Checklist

- [ ] Database connection working (`/api/health` returns 200)
- [ ] Manual lead creation via `/api/leads` POST
- [ ] Chat-based lead capture from Claude
- [ ] Email update for existing leads
- [ ] Check `leads` table for new records
- [ ] Monitor console for any remaining errors

---

## Next Steps

1. **Verify DATABASE_URL** is set correctly in your environment
2. **Restart the application** to apply fixes
3. **Test using the diagnostic commands** above
4. **Check logs** for any connection errors
5. **Monitor API responses** for proper error messages

If leads still aren't being saved:
- Check PostgreSQL is running and accessible
- Verify the connection string in DATABASE_URL
- Run `/api/health` to diagnose connection issues
- Check application logs for specific error messages
