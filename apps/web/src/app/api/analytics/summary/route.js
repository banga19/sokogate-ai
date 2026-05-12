import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET(request) {
  try {
    // Admin authentication
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 30);
    const eventType = searchParams.get("event_type");

    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const thresholdStr = thresholdDate.toISOString();

    // Build queries based on filters
    let typeFilter = "";
    if (eventType) {
      typeFilter = `AND event_type = '${eventType.replace(/'/g, "''")}'`; // Safe enough for enum
    }

    // 1. Total events by type (last N days)
    const byTypeQuery = `
      SELECT event_type, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= '${thresholdStr}'
      ${typeFilter}
      GROUP BY event_type
      ORDER BY count DESC
    `;
    const byTypeRows = await sql(byTypeQuery, []);

    // 2. Daily event trends (last N days)
    const dailyQuery = `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= '${thresholdStr}'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const dailyRows = await sql(dailyQuery, []);

    // 3. Unique visitors (last N days)
    const visitorsQuery = `
      SELECT COUNT(DISTINCT visitor_id) as unique_visitors
      FROM analytics_events
      WHERE created_at >= '${thresholdStr}'
    `;
    const [{ unique_visitors }] = await sql(visitorsQuery, []);

    // 4. Conversion funnel: visitors who triggered key events
    const funnelQuery = `
      SELECT
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'chat_started') as started_chat,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'lead_captured') as captured_leads,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'feedback_submitted') as gave_feedback,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'human_handoff_requested') as requested_handoff
      FROM analytics_events
      WHERE created_at >= '${thresholdStr}'
    `;
    const funnel = await sql(funnelQuery, []);

    // 5. Most recent activity
    const recentQuery = `
      SELECT event_type, visitor_id, created_at, event_data
      FROM analytics_events
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const recent = await sql(recentQuery, []);

    // 6. Lead capture rate by category (if we have that data)
    // This would join with leads table - let's do a simpler version from event data
    const captureRateQuery = `
      SELECT
        (event_data->>'category') as category,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_type = 'lead_captured'
        AND created_at >= '${thresholdStr}'
        AND event_data ? 'category'
      GROUP BY (event_data->>'category')
      ORDER BY count DESC
    `;
    const categoryRows = await sql(captureRateQuery, []);

    // Format response
    return Response.json({
      period_days: days,
      date_range: {
        from: thresholdStr.split('T')[0],
        to: new Date().toISOString().split('T')[0],
      },
      summary: {
        total_events: byTypeRows.reduce((sum, r) => sum + Number(r.count), 0),
        unique_visitors: Number(unique_visitors),
        by_event_type: byTypeRows,
        daily_trends: dailyRows,
        funnel: {
          chat_started: Number(funnel.started_chat),
          leads_captured: Number(funnel.captured_leads),
          feedback_given: Number(funnel.gave_feedback),
          handoff_requested: Number(funnel.requested_handoff),
          conversion_rate: funnel.started_chat > 0
            ? ((Number(funnel.captured_leads) / Number(funnel.started_chat)) * 100).toFixed(2) + '%'
            : '0%',
        },
        top_categories: categoryRows,
      },
      recent_activity: recent,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return Response.json(
      { error: "Failed to generate analytics summary" },
      { status: 500 }
    );
  }
}
