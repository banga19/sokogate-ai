import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";
import { ok, error } from "@/app/api/utils/apiResponse";

export async function GET() {
  try {
    const settings =
      await sql`SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`;
    return ok(settings[0] || {});
  } catch (error) {
    console.error(error);
    return error("Failed to fetch settings", 500);
  }
}

export async function POST(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

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

    return ok(settings[0]);
  } catch (error) {
    console.error(error);
    return error("Failed to update settings", 500);
  }
}
