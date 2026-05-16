import sql from "@/app/api/utils/sql";
import { requireUser } from "@/app/api/utils/adminAuth";

export async function GET(request) {
  try {
    // Accept any valid authenticated session (admin data visible to all logged-in users)
    const auth = await requireUser(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    // Leads per day for last 14 days
    const dailyLeads = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN score = 'High' THEN 1 END) as high,
        COUNT(CASE WHEN score = 'Medium' THEN 1 END) as medium,
        COUNT(CASE WHEN score = 'Low' THEN 1 END) as low
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Score distribution
    const scoreBreakdown = await sql`
      SELECT score, COUNT(*) as count
      FROM leads
      GROUP BY score
    `;

    // Status breakdown
    const statusBreakdown = await sql`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
    `;

    // Total conversion rate (Qualified / Total)
    const totals = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Qualified' THEN 1 END) as qualified,
        COUNT(CASE WHEN score = 'High' THEN 1 END) as high_intent,
        COUNT(CASE WHEN whatsapp IS NOT NULL AND whatsapp != '' THEN 1 END) as with_whatsapp
      FROM leads
    `;

    return Response.json({
      dailyLeads,
      scoreBreakdown,
      statusBreakdown,
      totals: totals[0],
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
