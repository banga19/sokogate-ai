import sql from "@/app/api/utils/sql";
import { serverEvents } from "@/server/pubsub";

export async function GET() {
  try {
    const leads = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    return Response.json(leads);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, source } =
      await request.json();

    const newLead = await sql`
      INSERT INTO leads (name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, source)
      VALUES (${name}, ${email}, ${phone}, ${whatsapp}, ${message}, ${score}, ${intent_summary}, ${category}, ${keyword_score}, ${source || 'manual'})
      RETURNING *
    `;

    // Broadcast new lead
    serverEvents.emitLead(newLead[0]);

    return Response.json(newLead[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, status, payment_status, shipping_status, shipping_tracking_number } = await request.json();

    // Update only the fields that are provided (single-field updates per request)
    if (status !== undefined) {
      const updated = await sql`UPDATE leads SET status = ${status} WHERE id = ${id} RETURNING *`;
      serverEvents.emitLeadUpdate(updated[0]);
      return Response.json(updated[0]);
    }
    if (payment_status !== undefined) {
      const updated = await sql`UPDATE leads SET payment_status = ${payment_status} WHERE id = ${id} RETURNING *`;
      serverEvents.emitLeadUpdate(updated[0]);
      return Response.json(updated[0]);
    }
    if (shipping_status !== undefined) {
      const updated = await sql`UPDATE leads SET shipping_status = ${shipping_status} WHERE id = ${id} RETURNING *`;
      serverEvents.emitLeadUpdate(updated[0]);
      return Response.json(updated[0]);
    }
    if (shipping_tracking_number !== undefined) {
      const updated = await sql`UPDATE leads SET shipping_tracking_number = ${shipping_tracking_number} WHERE id = ${id} RETURNING *`;
      serverEvents.emitLeadUpdate(updated[0]);
      return Response.json(updated[0]);
    }

    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
