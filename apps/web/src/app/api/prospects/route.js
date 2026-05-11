import sql from "@/app/api/utils/sql";

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
  try {
    const { id, ...updates } = await request.json();

    // Build dynamic UPDATE statement
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(updates);

    if (!setClause) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

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
