import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function POST(request) {
  try {
    const { leadId, reason, visitorId, urgency = "normal" } = await request.json();

    // Validate required fields
    if (!leadId && !visitorId) {
      return Response.json(
        { error: "Either leadId or visitorId is required" },
        { status: 400 }
      );
    }

    // Create handoff record and optionally update lead in a single transaction
    const [result] = await sql.transaction(async (client) => {
      // Insert handoff request
      const handoffRes = await client.query(
        `INSERT INTO handoff_requests (lead_id, visitor_id, reason, urgency, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [leadId || null, visitorId || null, reason || "Requested human assistance", urgency]
      );
      const handoff = handoffRes.rows[0];

      // If lead_id provided, update lead's handoff_requested flag
      if (leadId) {
        const updateRes = await client.query(
          `UPDATE leads
           SET handoff_requested = TRUE,
               conversation_stage = 'handoff_requested',
               status = 'Qualified'
           WHERE id = $1`,
          [leadId]
        );
        if (updateRes.rowCount === 0) {
          throw new Error("Lead not found during handoff update");
        }
      }

      return handoff;
    });

    // Emit real-time event for dashboard notifications
    try {
      const serverEvents = (await import("@/server/pubsub")).serverEvents;
      if (serverEvents?.emitHandoff) {
        serverEvents.emitHandoff(result);
      }
    } catch (e) {
      console.warn("Could not emit handoff event:", e);
    }

    return Response.json({
      success: true,
      handoffId: result.id,
      message: "Human agent will be notified and assist you shortly",
    });
  } catch (error) {
    console.error("Handoff error:", error);
    return Response.json(
      { error: "Failed to create handoff request" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Admin authentication
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Validate status
    const allowedStatus = ["pending", "in_progress", "resolved", "cancelled"];
    if (!allowedStatus.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Sanitize limit
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const requests = await sql`
      SELECT h.*, l.name as lead_name, l.email, l.whatsapp, l.category, l.score
      FROM handoff_requests h
      LEFT JOIN leads l ON h.lead_id = l.id
      WHERE h.status = ${status}
      ORDER BY
        CASE h.urgency
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 2
        END,
        h.created_at DESC
      LIMIT ${safeLimit}
    `;

    return Response.json({ requests });
  } catch (error) {
    console.error("Error fetching handoff requests:", error);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
