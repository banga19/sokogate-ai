import sql from "@/app/api/utils/sql";
import { serverEvents } from "@/server/pubsub";
import { parseCSV, mapLeadRow, validateLead } from "@/utils/csvImport";
import { requireAdmin } from "@/app/api/utils/adminAuth";

export async function POST(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const filename = file.name || 'upload.csv';
    if (!filename.toLowerCase().endsWith('.csv')) {
      return Response.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    // Read file content
    const csvText = await file.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return Response.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // Parse CSV
    const rows = parseCSV(csvText);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Debug: log first row to see column names
    if (process.env.NODE_ENV === 'development' && rows.length > 0) {
      console.log('CSV Import - First row raw data:', JSON.stringify(rows[0], null, 2));
      console.log('CSV Import - Column names:', Object.keys(rows[0]));
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Account for header row

      try {
        const lead = mapLeadRow(row);
        const validationError = validateLead(lead, rowNum);
        if (validationError) {
          errorCount++;
          // Include row details in error for debugging
          const rowPreview = JSON.stringify(row).substring(0, 150);
          errors.push(`${validationError} - Row data: ${rowPreview}`);
          // Also log to server console for development
          console.error(`Row ${rowNum} validation failed:`, lead, 'from raw:', Object.keys(row));
          continue;
        }

        // Insert into database
        const newLead = await sql`
          INSERT INTO leads (name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, source)
          VALUES (${lead.name}, ${lead.email}, ${lead.phone}, ${lead.whatsapp}, ${lead.message}, ${lead.score}, ${lead.intent_summary}, ${lead.category}, ${lead.keyword_score}, ${lead.source})
          RETURNING *
        `;

        if (newLead[0]) {
          serverEvents.emitLead(newLead[0]);
          successCount++;
        } else {
          errorCount++;
          errors.push(`Row ${rowNum}: Failed to insert lead`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Import error at row ${rowNum}:`, err);
        errors.push(`Row ${rowNum}: ${err.message || 'Database error'}`);
      }
    }

    return Response.json({
      success: true,
      message: `Import complete: ${successCount} leads imported, ${errorCount} errors`,
      total: rows.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 100), // Limit error details to first 100
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return Response.json({ error: 'Failed to process CSV file' }, { status: 500 });
  }
}
