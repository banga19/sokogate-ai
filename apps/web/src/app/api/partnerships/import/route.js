import sql from "@/app/api/utils/sql";
import { parseCSV, mapPartnershipRow } from "@/utils/csvImport";
import { readFile } from "fs/promises";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "../../../sales-and-funding-assets");

export async function GET() {
  return Response.json({ message: "Import endpoint for partnerships" });
}

export async function POST() {
  try {
    const csvPath = path.join(CSV_PATH, "TRACKER-PARTNERSHIPS.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    const rows = await parseCSV(csvContent);
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const partnership = mapPartnershipRow(row);

        // Skip if already exists (by company name)
        const existing = await sql`
          SELECT id FROM partnerships WHERE company_name = ${partnership.company_name}
        `;

        if (existing.length > 0) {
          continue;
        }

        await sql`
          INSERT INTO partnerships (
            company_name, country, tier, contact_name, title, email, phone,
            capability, interest_level, status, revenue_model,
            monthly_revenue_potential_usd, notes
          )
          VALUES (
            ${partnership.company_name}, ${partnership.country}, ${partnership.tier},
            ${partnership.contact_name}, ${partnership.title}, ${partnership.email},
            ${partnership.phone}, ${partnership.capability}, ${partnership.interest_level || 'Prospecting'},
            ${partnership.status || 'Prospecting'}, ${partnership.revenue_model},
            ${partnership.monthly_revenue_potential_usd}, ${partnership.notes}
          )
        `;
        successCount++;
      } catch (err) {
        errorCount++;
        console.error("Partnership import error:", err.message);
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${successCount} partnerships (${errorCount} errors/skipped)`,
      imported: successCount,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return Response.json({ error: "Failed to import partnerships" }, { status: 500 });
  }
}
