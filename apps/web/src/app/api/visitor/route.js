import sql from "@/app/api/utils/sql";

// GET /api/visitor?id=vis_xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get("id");

    if (!visitorId) {
      return Response.json({ error: "Visitor ID required" }, { status: 400 });
    }

    const result = await sql`SELECT * FROM visitors WHERE visitor_id = ${visitorId} LIMIT 1`;

    if (result.length === 0) {
      return Response.json({ visitor: null });
    }

    return Response.json({ visitor: result[0] });
  } catch (error) {
    console.error("Error fetching visitor:", error);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/visitor - create or update visitor
export async function POST(request) {
  try {
    const { visitorId, name, company, email, phone, conversationStage } = await request.json();

    if (!visitorId) {
      return Response.json({ error: "Visitor ID required" }, { status: 400 });
    }

    // Try to update first
    const updates = [];
    const params = [];

    if (name) { updates.push(`name = $${params.length + 1}`); params.push(name); }
    if (company) { updates.push(`company = $${params.length + 1}`); params.push(company); }
    if (email) { updates.push(`email = $${params.length + 1}`); params.push(email); }
    if (phone) { updates.push(`phone = $${params.length + 1}`); params.push(phone); }
    if (conversationStage) {
      updates.push(`conversation_stage = $${params.length + 1}`);
      params.push(conversationStage);
    }

    if (updates.length > 0) {
      updates.push(`last_seen = NOW()`);
      updates.push(`visit_count = visit_count + 1`);

      const query = `
        UPDATE visitors
        SET ${updates.join(", ")}
        WHERE visitor_id = $${params.length + 1}
        RETURNING *
      `;
      params.push(visitorId);

      const result = await sql(query, params);

      if (result.length > 0) {
        return Response.json({ visitor: result[0], action: "updated" });
      }
    }

    // If no update occurred or visitor doesn't exist, create new
    const [newVisitor] = await sql`
      INSERT INTO visitors (visitor_id, name, company, email, phone, conversation_stage, visit_count)
      VALUES (
        ${visitorId},
        ${name || null},
        ${company || null},
        ${email || null},
        ${phone || null},
        ${conversationStage || 'greeting'},
        1
      )
      RETURNING *
    `;

    return Response.json({ visitor: newVisitor, action: "created" });
  } catch (error) {
    console.error("Error upserting visitor:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
