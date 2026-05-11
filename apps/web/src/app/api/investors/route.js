import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const investors = await sql`SELECT * FROM investors ORDER BY created_at DESC`;
    return Response.json(investors);
  } catch (error) {
    console.error("Failed to fetch investors:", error);
    return Response.json({ error: "Failed to fetch investors" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      investor_name,
      fund_name,
      tier,
      ticket_size_usd_min,
      ticket_size_usd_max,
      geographic_focus,
      investment_thesis,
      contact_name,
      email,
      phone,
      decision_timeline_weeks,
      first_contact_date,
      status,
      meetings_count,
      term_sheet_date,
      amount_committed_usd,
      valuation_pre_money_usd,
      notes,
    } = body;

    const investor = await sql`
      INSERT INTO investors (
        investor_name, fund_name, tier, ticket_size_usd_min, ticket_size_usd_max,
        geographic_focus, investment_thesis, contact_name, email, phone,
        decision_timeline_weeks, first_contact_date, status, meetings_count,
        term_sheet_date, amount_committed_usd, valuation_pre_money_usd, notes
      )
      VALUES (
        ${investor_name}, ${fund_name}, ${tier || 'T2'},
        ${ticket_size_usd_min}, ${ticket_size_usd_max}, ${geographic_focus},
        ${investment_thesis}, ${contact_name}, ${email}, ${phone},
        ${decision_timeline_weeks}, ${first_contact_date}, ${status || 'Not Started'},
        ${meetings_count || 0}, ${term_sheet_date}, ${amount_committed_usd},
        ${valuation_pre_money_usd}, ${notes}
      )
      RETURNING *
    `;

    return Response.json(investor[0]);
  } catch (error) {
    console.error("Failed to create investor:", error);
    return Response.json({ error: "Failed to create investor" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json();

    // Whitelist allowed fields to prevent SQL injection
    const ALLOWED_FIELDS = [
      'investor_name', 'fund_name', 'tier', 'ticket_size_usd_min',
      'ticket_size_usd_max', 'geographic_focus', 'investment_thesis',
      'contact_name', 'email', 'phone', 'decision_timeline_weeks',
      'first_contact_date', 'status', 'meetings_count', 'term_sheet_date',
      'amount_committed_usd', 'valuation_pre_money_usd', 'notes'
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
      UPDATE investors
      SET ${setClause}
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Investor not found" }, { status: 404 });
    }

    return Response.json(updated[0]);
  } catch (error) {
    console.error("Failed to update investor:", error);
    return Response.json({ error: "Failed to update investor" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }

    await sql`DELETE FROM investors WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete investor:", error);
    return Response.json({ error: "Failed to delete investor" }, { status: 500 });
  }
}
