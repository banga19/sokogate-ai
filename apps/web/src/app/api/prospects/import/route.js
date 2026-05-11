import sql from "@/app/api/utils/sql";
import { parseCSV, mapProspectRow } from "@/utils/csvImport";
import { readFile } from "fs/promises";
import path from "path";

// Absolute path to sales-and-funding-assets (WSL2 Ubuntu)
const CSV_PATH = "/home/apop/sales-and-funding-assets";

export async function GET() {
  return Response.json({ message: "Import endpoint for prospects" });
}

export async function POST() {
  try {
    // Read the CSV file
    const csvPath = path.join(CSV_PATH, "TRACKER-PROSPECTS.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    // Parse CSV
    const rows = await parseCSV(csvContent);

    // Insert each row
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const prospect = mapProspectRow(row);

        // Check if prospect already exists (by company + email if available)
        const existing = await sql`
          SELECT id FROM sales_prospects
          WHERE company = ${prospect.company}
          ${prospect.email ? `AND email = ${prospect.email}` : ''}
        `;

        if (existing.length > 0) {
          // Skip duplicate
          continue;
        }

        await sql`
          INSERT INTO sales_prospects (
            company, contact_name, email, phone, whatsapp, tier, location,
            annual_spend_kes, pain_point, engagement_angle, decision_maker_title,
            status, notes
          )
          VALUES (
            ${prospect.company}, ${prospect.contact_name}, ${prospect.email},
            ${prospect.phone}, ${prospect.whatsapp}, ${prospect.tier},
            ${prospect.location}, ${prospect.annual_spend_kes}, ${prospect.pain_point},
            ${prospect.engagement_angle}, ${prospect.decision_maker_title},
            ${prospect.status}, ${prospect.notes}
          )
        `;
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push(err.message);
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${successCount} prospects (${errorCount} errors/skipped)`,
      imported: successCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return Response.json(
      { error: "Failed to import prospects", details: error.message },
      { status: 500 }
    );
  }
}
