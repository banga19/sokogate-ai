import sql from "@/app/api/utils/sql";

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

    // Create handoff record
    const [result] = await sql`
      INSERT INTO handoff_requests (
        lead_id,
        visitor_id,
        reason,
        urgency,
        status
      )
      VALUES (
        ${leadId || null},
        ${visitorId || null},
        ${reason || "Requested human assistance"},
        ${urgency},
        'pending'
      )
      RETURNING *
    `;

    // If lead_id provided, update lead's handoff_requested flag
    if (leadId) {
      await sql`
        UPDATE leads
        SET handoff_requested = TRUE,
            conversation_stage = 'handoff_requested',
            status = 'Qualified'
        WHERE id = ${leadId}
      `;
    }

    // Emit real-time event for dashboard notifications
    // (Assuming serverEvents is available - may need adjustment)
    try {
      const serverEvents = (await import("@/server/pubsub")).serverEvents;
      if (serverEvents?.emitHandoff) {
        serverEvents.emitHandoff(result[0]);
      }
    } catch (e) {
      console.warn("Could not emit handoff event:", e);
    }

    return Response.json({
      success: true,
      handoffId: result[0].id,
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");

    const query = `
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
      LIMIT ${limit}
    `;

    const requests = await sql(query);

    return Response.json({ requests });
  } catch (error) {
    console.error("Error fetching handoff requests:", error);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
