import sql from "@/app/api/utils/sql";
import { parseCSV, mapInvestorRow } from "@/utils/csvImport";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/app/api/utils/adminAuth";

// Use environment variable for assets path, fallback to default for backwards compatibility
const CSV_PATH = process.env.ASSETS_BASE_PATH || process.env.SALES_ASSETS_PATH || "/home/apop/sales-and-funding-assets";

export async function GET() {
  return Response.json({ message: "Import endpoint for investors" });
}

export async function POST() {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const csvPath = path.join(CSV_PATH, "TRACKER-INVESTORS.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    const rows = await parseCSV(csvContent);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const investor = mapInvestorRow(row);

        // Skip if already imported (by fund name)
        const existing = await sql`
          SELECT id FROM investors WHERE fund_name = ${investor.fund_name}
        `;

        if (existing.length > 0) {
          continue;
        }

        await sql`
          INSERT INTO investors (
            investor_name, fund_name, tier, ticket_size_usd_min, ticket_size_usd_max,
            geographic_focus, investment_thesis, contact_name, email, phone,
            decision_timeline_weeks, first_contact_date, status, notes
          )
          VALUES (
            ${investor.investor_name}, ${investor.fund_name}, ${investor.tier},
            ${investor.ticket_size_usd_min}, ${investor.ticket_size_usd_max},
            ${investor.geographic_focus}, ${investor.investment_thesis},
            ${investor.contact_name}, ${investor.email}, ${investor.phone},
            ${investor.decision_timeline_weeks}, ${investor.first_contact_date},
            ${investor.status}, ${investor.notes}
          )
        `;
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Row ${i + 2}: ${err.message || 'Database error'}`);
        console.error(`Investor import error at row ${i + 2}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${successCount} investors (${errorCount} errors/skipped)`,
      imported: successCount,
      errors: errors.slice(0, 100),
      errorCount,
      total: rows.length,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return Response.json({ error: "Failed to import investors" }, { status: 500 });
  }
}
