import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function POST(request) {
  try {
    const { events } = await request.json();

    // Validate payload
    if (!Array.isArray(events) || events.length === 0) {
      return Response.json(
        { error: "Invalid payload: events array required" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse (max 100 events per request)
    if (events.length > 100) {
      return Response.json(
        { error: "Too many events. Maximum 100 per request." },
        { status: 400 }
      );
    }

    // Prepare bulk insert
    const eventRows = events.map((event, idx) => {
      // Validate required fields
      if (!event.type || !event.visitorId || !event.timestamp) {
        throw new Error(`Event ${idx} missing required fields`);
      }

      // Extract all fields except type, visitorId, timestamp for event_data
      const { type, visitorId, timestamp, ...rest } = event;
      return {
        event_type: type,
        visitor_id: visitorId,
        event_data: rest, // plain object; pg will JSON-serialize for jsonb column
        created_at: new Date(timestamp).toISOString(),
      };
    });

    // Perform bulk insert using transaction for performance
    await sql.transaction(async (client) => {
      for (const row of eventRows) {
        await client.query(
          `INSERT INTO analytics_events (event_type, visitor_id, event_data, created_at) VALUES ($1, $2, $3::jsonb, $4)`,
          [row.event_type, row.visitor_id, row.event_data, row.created_at]
        );
      }
    });

    // Success response
    return Response.json({
      success: true,
      received: events.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Analytics log error:", error);
    return Response.json(
      { error: "Failed to log analytics", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for analytics querying (admin use)
 * Supports filtering by event_type, visitor_id, and date range
 */
export async function GET(request) {
  try {
    // Admin authentication
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event_type");
    const visitorId = searchParams.get("visitor_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query using sql template tag with conditional WHERE
    let query = `
      SELECT *
      FROM analytics_events
      WHERE 1=1
    `;
    const params = [];

    if (eventType) {
      query += ` AND event_type = $${params.length + 1}`;
      params.push(eventType);
    }
    if (visitorId) {
      query += ` AND visitor_id = $${params.length + 1}`;
      params.push(visitorId);
    }
    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Get paginated results
    const rows = await sql(query, params);

    // Get total count separately
    let countQuery = `SELECT COUNT(*) FROM analytics_events WHERE 1=1`;
    const countParams = [];
    if (eventType) {
      countQuery += ` AND event_type = $${countParams.length + 1}`;
      countParams.push(eventType);
    }
    if (visitorId) {
      countQuery += ` AND visitor_id = $${countParams.length + 1}`;
      countParams.push(visitorId);
    }
    if (startDate) {
      countQuery += ` AND created_at >= $${countParams.length + 1}`;
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ` AND created_at <= $${countParams.length + 1}`;
      countParams.push(endDate);
    }

    const [{ count }] = await sql(countQuery, countParams);

    return Response.json({
      events: rows,
      total: Number(count),
      limit,
      offset,
      hasMore: offset + rows.length < Number(count),
    });
  } catch (error) {
    console.error("Analytics query error:", error);
    return Response.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
