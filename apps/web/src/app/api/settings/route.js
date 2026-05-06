import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const settings =
      await sql`SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`;
    return Response.json(settings[0] || {});
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const {
      business_name,
      business_description,
      ai_goal,
      primary_color,
      secondary_color,
    } = await request.json();

    // Update the most recent settings or create if none exist
    const settings = await sql`
      INSERT INTO business_settings (business_name, business_description, ai_goal, primary_color, secondary_color)
      VALUES (${business_name}, ${business_description}, ${ai_goal}, ${primary_color}, ${secondary_color})
      RETURNING *
    `;

    return Response.json(settings[0]);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
