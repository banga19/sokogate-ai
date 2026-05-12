import sql from "@/app/api/utils/sql";
import { generateInitialMetrics } from "@/utils/csvImport";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET() {
  try {
    const metrics = await sql`SELECT * FROM weekly_metrics ORDER BY week_number DESC, created_at DESC`;
    return Response.json(metrics);
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return Response.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

export async function POST() {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Check if metrics already exist
    const existing = await sql`SELECT COUNT(*) as count FROM weekly_metrics`;
    if (existing[0].count > 0) {
      return Response.json({
        success: false,
        message: "Metrics already initialized. Use PATCH to update individual metrics.",
      });
    }

    // Generate initial metrics from 30-day plan
    const initialMetrics = generateInitialMetrics();

    // Insert all metrics
    for (const metric of initialMetrics) {
      await sql`
        INSERT INTO weekly_metrics (
          week_number, date_range, metric_name, target_value,
          actual_value, unit, status, notes
        )
        VALUES (
          ${metric.week_number}, ${metric.date_range}, ${metric.metric_name},
          ${metric.target_value}, ${metric.actual_value}, ${metric.unit},
          ${metric.status}, ${metric.notes}
        )
      `;
    }

    return Response.json({
      success: true,
      message: `Initialized ${initialMetrics.length} metric targets from 30-day plan`,
      imported: initialMetrics.length,
    });
  } catch (error) {
    console.error("Metrics import failed:", error);
    return Response.json({ error: "Failed to initialize metrics" }, { status: 500 });
  }
}
