import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET() {
  try {
    const prospects = await sql`SELECT * FROM sales_prospects ORDER BY created_at DESC`;
    return Response.json(prospects);
  } catch (error) {
    console.error("Failed to fetch prospects:", error);
    return Response.json({ error: "Failed to fetch prospects" }, { status: 500 });
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
    const {
      company,
      contact_name,
      email,
      phone,
      whatsapp,
      tier,
      location,
      annual_spend_kes,
      pain_point,
      engagement_angle,
      decision_maker_title,
      status,
      next_action_date,
      last_contact_date,
      notes,
    } = body;

    const prospect = await sql`
      INSERT INTO sales_prospects (
        company, contact_name, email, phone, whatsapp, tier, location,
        annual_spend_kes, pain_point, engagement_angle, decision_maker_title,
        status, next_action_date, last_contact_date, notes
      )
      VALUES (
        ${company}, ${contact_name}, ${email}, ${phone}, ${whatsapp},
        ${tier || 'T2'}, ${location}, ${annual_spend_kes}, ${pain_point},
        ${engagement_angle}, ${decision_maker_title}, ${status || 'New'},
        ${next_action_date}, ${last_contact_date}, ${notes}
      )
      RETURNING *
    `;

    return Response.json(prospect[0]);
  } catch (error) {
    console.error("Failed to create prospect:", error);
    return Response.json({ error: "Failed to create prospect" }, { status: 500 });
  }
}

export async function PATCH(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, ...updates } = await request.json();

    // Whitelist allowed fields to prevent SQL injection
    const ALLOWED_FIELDS = [
      'company', 'contact_name', 'email', 'phone', 'whatsapp',
      'tier', 'location', 'annual_spend_kes', 'pain_point',
      'engagement_angle', 'decision_maker_title', 'status',
      'next_action_date', 'last_contact_date', 'notes'
    ];

    const filteredUpdates = Object.entries(updates).filter(([key]) =>
      ALLOWED_FIELDS.includes(key)
    );

    if (filteredUpdates.length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Build parameterized UPDATE with safe column names
    const setClause = filteredUpdates
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = filteredUpdates.map(([, value]) => value);

    const updated = await sql`
      UPDATE sales_prospects
      SET ${setClause}
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Prospect not found" }, { status: 404 });
    }

    return Response.json(updated[0]);
  } catch (error) {
    console.error("Failed to update prospect:", error);
    return Response.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}

export async function DELETE(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }

    await sql`DELETE FROM sales_prospects WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete prospect:", error);
    return Response.json({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
