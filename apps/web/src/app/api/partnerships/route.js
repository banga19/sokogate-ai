import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET(request) {
  try {
    // Admin authentication
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const partnerships = await sql`SELECT * FROM partnerships ORDER BY created_at DESC`;
    return Response.json(partnerships);
  } catch (error) {
    console.error("Failed to fetch partnerships:", error);
    return Response.json({ error: "Failed to fetch partnerships" }, { status: 500 });
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
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, ...updates } = await request.json();

    // Whitelist allowed fields to prevent SQL injection
    const ALLOWED_FIELDS = [
      'company_name', 'country', 'tier', 'contact_name', 'title',
      'email', 'phone', 'capability', 'interest_level', 'status',
      'first_contact_date', 'discovery_call_date', 'proposal_sent_date',
      'proposal_signed_date', 'pilot_start_date', 'revenue_model',
      'monthly_revenue_potential_usd', 'actual_monthly_revenue_usd', 'notes'
    ];

    const filteredUpdates = Object.entries(updates).filter(([key]) =>
      ALLOWED_FIELDS.includes(key)
    );

    if (filteredUpdates.length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const setClause = filteredUpdates
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = filteredUpdates.map(([, value]) => value);

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

    await sql`DELETE FROM partnerships WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete partnership:", error);
    return Response.json({ error: "Failed to delete partnership" }, { status: 500 });
  }
}
