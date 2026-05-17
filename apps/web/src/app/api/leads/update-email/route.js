import sql from "@/app/api/utils/sql";
import { serverEvents } from "@/server/pubsub";

export async function PATCH(request) {
  try {
    const { visitorId, email } = await request.json();

    if (!visitorId || !email) {
      return Response.json({ error: "Visitor ID and email required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Find the lead associated with this visitor
    const visitorResult = await sql`SELECT lead_id FROM visitors WHERE visitor_id = ${visitorId} LIMIT 1`;
    if (visitorResult.length === 0 || !visitorResult[0].lead_id) {
      return Response.json({ error: "No lead found for this visitor" }, { status: 404 });
    }

    const leadId = visitorResult[0].lead_id;

    // Update the lead's email
    const updateResult = await sql`UPDATE leads SET email = ${email} WHERE id = ${leadId} RETURNING *`;

    if (updateResult.length === 0) {
      return Response.json({ error: "Lead update failed" }, { status: 500 });
    }

    const updatedLead = updateResult[0];
    serverEvents.emitLeadUpdate(updatedLead);

    return Response.json({
      success: true,
      lead: updatedLead,
      message: "Email updated successfully"
    });
  } catch (error) {
    console.error("Email update error:", error);
    return Response.json({ error: "Failed to update email" }, { status: 500 });
  }
}
