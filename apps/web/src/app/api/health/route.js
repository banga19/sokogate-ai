import sql from "@/app/api/utils/sql";

/**
 * Health check endpoint to diagnose database connectivity
 * GET /api/health
 */
export async function GET(request) {
  const checks = {
    timestamp: new Date().toISOString(),
    database: null,
    errors: []
  };

  // Check database connection
  try {
    const result = await sql`SELECT NOW() as current_time, COUNT(*) as lead_count FROM leads`;
    if (result && result.length > 0) {
      checks.database = {
        status: "connected",
        currentTime: result[0]?.current_time,
        leadCount: result[0]?.lead_count,
      };
    } else {
      checks.database = {
        status: "error",
        message: "Query returned no results"
      };
      checks.errors.push("Database query returned empty result");
    }
  } catch (err) {
    checks.database = {
      status: "error",
      message: err.message
    };
    checks.errors.push(`Database connection failed: ${err.message}`);
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    checks.errors.push("DATABASE_URL environment variable is not set");
  } else if (process.env.DATABASE_URL.includes("<") || process.env.DATABASE_URL.includes(">")) {
    checks.errors.push("DATABASE_URL contains invalid placeholder characters - check environment configuration");
  }

  const hasErrors = checks.errors.length > 0;
  const statusCode = hasErrors ? 503 : 200;

  return Response.json(checks, { status: statusCode });
}
