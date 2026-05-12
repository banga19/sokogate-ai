import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET(request) {
  try {
    // Return all metrics, optionally filtered by week or date range via query params
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const metric = searchParams.get("metric");

    let query = `SELECT * FROM weekly_metrics`;
    const conditions = [];
    const values = [];

    if (week) {
      conditions.push(`week_number = $${values.length + 1}`);
      values.push(parseInt(week));
    }
    if (metric) {
      conditions.push(`metric_name = $${values.length + 1}`);
      values.push(metric);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY week_number DESC, created_at DESC";

    const metrics = await sql(query, values);
    return Response.json(metrics);
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return Response.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

export async function POST(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { week_number, date_range, metric_name, target_value, actual_value, unit, status, notes } = body;

    // Upsert: update if exists for this week+metric, else insert
    const existing = await sql`
      SELECT id FROM weekly_metrics
      WHERE week_number = ${week_number} AND metric_name = ${metric_name}
    `;

    if (existing.length > 0) {
      const updated = await sql`
        UPDATE weekly_metrics
        SET target_value = ${target_value},
            actual_value = ${actual_value},
            unit = ${unit || 'count'},
            status = ${status || 'Pending'},
            notes = ${notes},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return Response.json(updated[0]);
    } else {
      const metric = await sql`
        INSERT INTO weekly_metrics (week_number, date_range, metric_name, target_value, actual_value, unit, status, notes)
        VALUES (${week_number}, ${date_range}, ${metric_name}, ${target_value}, ${actual_value}, ${unit || 'count'}, ${status || 'Pending'}, ${notes})
        RETURNING *
      `;
      return Response.json(metric[0]);
    }
  } catch (error) {
    console.error("Failed to create/update metric:", error);
    return Response.json({ error: "Failed to save metric" }, { status: 500 });
  }
}
