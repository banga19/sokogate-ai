import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const partnerships = await sql`SELECT * FROM partnerships ORDER BY created_at DESC`;
    return Response.json(partnerships);
  } catch (error) {
    console.error("Failed to fetch partnerships:", error);
    return Response.json({ error: "Failed to fetch partnerships" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      company_name,
      country,
      tier,
      contact_name,
      title,
      email,
      phone,
      capability,
      interest_level,
      status,
      first_contact_date,
      discovery_call_date,
      proposal_sent_date,
      proposal_signed_date,
      pilot_start_date,
      revenue_model,
      monthly_revenue_potential_usd,
      actual_monthly_revenue_usd,
      notes,
    } = body;

    const partnership = await sql`
      INSERT INTO partnerships (
        company_name, country, tier, contact_name, title, email, phone,
        capability, interest_level, status, first_contact_date,
        discovery_call_date, proposal_sent_date, proposal_signed_date,
        pilot_start_date, revenue_model, monthly_revenue_potential_usd,
        actual_monthly_revenue_usd, notes
      )
      VALUES (
        ${company_name}, ${country}, ${tier || 'T2'},
        ${contact_name}, ${title}, ${email}, ${phone},
        ${capability}, ${interest_level || 'Prospecting'},
        ${status || 'Prospecting'}, ${first_contact_date},
        ${discovery_call_date}, ${proposal_sent_date},
        ${proposal_signed_date}, ${pilot_start_date},
        ${revenue_model}, ${monthly_revenue_potential_usd},
        ${actual_monthly_revenue_usd}, ${notes}
      )
      RETURNING *
    `;

    return Response.json(partnership[0]);
  } catch (error) {
    console.error("Failed to create partnership:", error);
    return Response.json({ error: "Failed to create partnership" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json();

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(updates);

    if (!setClause) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await sql`
      UPDATE partnerships
      SET ${setClause}
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Partnership not found" }, { status: 404 });
    }

    return Response.json(updated[0]);
  } catch (error) {
    console.error("Failed to update partnership:", error);
    return Response.json({ error: "Failed to update partnership" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }

    await sql`DELETE FROM partnerships WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete partnership:", error);
    return Response.json({ error: "Failed to delete partnership" }, { status: 500 });
  }
}
