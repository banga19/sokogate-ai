import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { visitorId, leadId, rating, comment } = await request.json();

    // Rating should be 1-5
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Update the ai_interactions record with the latest interaction for this visitor/lead
    // Or insert a new feedback record
    try {
      await sql`
        UPDATE ai_interactions
        SET satisfaction_rating = ${rating}
        WHERE visitor_id = ${visitorId}
        AND id = (
          SELECT id FROM ai_interactions
          WHERE visitor_id = ${visitorId}
          ${leadId ? 'AND lead_id = ' + leadId : ''}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;
    } catch (e) {
      // If update fails (no matching interaction), create a new feedback entry
      await sql`
        INSERT INTO ai_interactions (visitor_id, lead_id, user_message, ai_response, satisfaction_rating)
        VALUES (${visitorId}, ${leadId || null}, 'FEEDBACK', 'FEEDBACK', ${rating})
      `;
    }

    return Response.json({ success: true, message: "Feedback recorded" });
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}
