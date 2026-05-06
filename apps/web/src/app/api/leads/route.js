import sql from "@/app/api/utils/sql";

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
    const { name, email, phone, message, score, intent_summary } =
      await request.json();

    const newLead = await sql`
      INSERT INTO leads (name, email, phone, message, score, intent_summary)
      VALUES (${name}, ${email}, ${phone}, ${message}, ${score}, ${intent_summary})
      RETURNING *
    `;

    return Response.json(newLead[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, status } = await request.json();
    const updatedLead = await sql`
      UPDATE leads 
      SET status = ${status} 
      WHERE id = ${id} 
      RETURNING *
    `;
    return Response.json(updatedLead[0]);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to update lead status" },
      { status: 500 },
    );
  }
}
