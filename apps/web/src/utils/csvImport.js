/**
 * CSV Import Utility for Sales & Funding Data
 * Simple CSV parser for Node.js environment
 */

/**
 * Parse CSV text into array of objects
 * Handles basic CSV with quoted fields
 */
export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const rowObj = {};
      headers.forEach((header, idx) => {
        rowObj[header.trim()] = values[idx]?.trim() || '';
      });
      rows.push(rowObj);
    }
  }
  return rows;
}

/**
 * Parse a single CSV line, respecting quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Map CSV row to prospect object
 */
export function mapProspectRow(row) {
  return {
    company: row.COMPANY || row.company || '',
    contact_name: row.DECISION_MAKER || row.contact_name || '',
    email: row.EMAIL || row.email || '',
    phone: row.PHONE || row.phone || '',
    whatsapp: row.WHATSAPP || row.whatsapp || '',
    tier: row.TIER || row.tier || 'T2',
    location: row.LOCATION || row.location || '',
    annual_spend_kes: row.ANNUAL_SPEND_KES || row.annual_spend_kes || null,
    pain_point: row.PAIN_POINT || row.pain_point || '',
    engagement_angle: row.ENGAGEMENT_ANGLE || row.engagement_angle || '',
    decision_maker_title: row.DECISION_MAKER || row.decision_maker_title || '',
    status: 'New',
    notes: row.NOTES || row.notes || '',
  };
}

/**
 * Map CSV row to investor object
 */
export function mapInvestorRow(row) {
  return {
    investor_name: row.INVESTOR || row.investor || '',
    fund_name: row.FUND_NAME || row.fund_name || '',
    tier: row.TIER || row.tier || 'T2',
    ticket_size_usd_min: parseTicketSize(row.TICKET_SIZE_USD || row.ticket_size_usd || ''),
    ticket_size_usd_max: parseTicketSizeMax(row.TICKET_SIZE_USD || row.ticket_size_usd || ''),
    geographic_focus: row.GEOGRAPHIC_FOCUS || row.geographic_focus || '',
    investment_thesis: row.INVESTMENT_THESIS || row.investment_thesis || '',
    contact_name: row.CONTACT_NAME || row.contact_name || '',
    email: row.EMAIL || row.email || '',
    phone: row.PHONE || row.phone || '',
    decision_timeline_weeks: parseInt(row.DECISION_TIMELINE_WEEKS) || null,
    first_contact_date: row.FIRST_CONTACT_DATE ? new Date(row.FIRST_CONTACT_DATE).toISOString().split('T')[0] : null,
    status: row.STATUS || 'Not Started',
    notes: row.NOTES || row.notes || '',
  };
}

/**
 * Parse ticket size string (e.g., "500K-2M" or "1M-5M")
 */
function parseTicketSize(ticketStr) {
  if (!ticketStr) return null;
  const clean = ticketStr.replace(/[^0-9.]/g, '');
  const match = ticketStr.match(/(\d+(?:\.\d+)?)([KkMmBb]?)/);
  if (!match) return null;
  let value = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  if (unit === 'K') value *= 1_000;
  if (unit === 'M') value *= 1_000_000;
  if (unit === 'B') value *= 1_000_000_000;
  return Math.round(value);
}

function parseTicketSizeMax(ticketStr) {
  if (!ticketStr) return null;
  const parts = ticketStr.split('-');
  if (parts.length === 2) {
    return parseTicketSize(parts[1]);
  }
  return parseTicketSize(ticketStr);
}

/**
 * Map CSV row to partnership object
 */
export function mapPartnershipRow(row) {
  return {
    company_name: row.COMPANY_NAME || row.company_name || '',
    country: row.COUNTRY || row.country || '',
    tier: row.TIER || row.tier || 'T2',
    contact_name: row.CONTACT_NAME || row.contact_name || '',
    title: row.TITLE || row.title || '',
    email: row.EMAIL || row.email || '',
    phone: row.PHONE || row.phone || '',
    capability: row.CAPABILITY || row.capability || '',
    interest_level: row.INTEREST_LEVEL || row.interest_level || 'Prospecting',
    status: row.STATUS || 'Prospecting',
    first_contact_date: row.FIRST_CONTACT_DATE ? new Date(row.FIRST_CONTACT_DATE).toISOString().split('T')[0] : null,
    discovery_call_date: row.DISCOVERY_CALL_DATE ? new Date(row.DISCOVERY_CALL_DATE).toISOString().split('T')[0] : null,
    proposal_sent_date: row.PROPOSAL_SENT_DATE ? new Date(row.PROPOSAL_SENT_DATE).toISOString().split('T')[0] : null,
    proposal_signed_date: row.PROPOSAL_SIGNED_DATE ? new Date(row.PROPOSAL_SIGNED_DATE).toISOString().split('T')[0] : null,
    pilot_start_date: row.PILOT_START_DATE ? new Date(row.PILOT_START_DATE).toISOString().split('T')[0] : null,
    revenue_model: row.REVENUE_MODEL || row.revenue_model || '',
    monthly_revenue_potential_usd: parseFloat(row.MONTHLY_REVENUE_POTENTIAL) || null,
    actual_monthly_revenue_usd: parseFloat(row.ACTUAL_MONTHLY_REVENUE) || null,
    notes: row.NOTES || row.notes || '',
  };
}

/**
 * Generate weekly metrics from 30-day action plan
 * Pre-populate Week 1-5 targets
 */
export function generateInitialMetrics() {
  const metrics = [
    // Week 1
    { week_number: 1, date_range: 'May 11-17', metric_name: 'Sales Emails Sent', target_value: 10, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 1, date_range: 'May 11-17', metric_name: 'Partnership Emails Sent', target_value: 2, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 1, date_range: 'May 11-17', metric_name: 'Investor Emails Sent', target_value: 5, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 1, date_range: 'May 11-17', metric_name: 'Email Responses Received', target_value: 3, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 1, date_range: 'May 11-17', metric_name: 'Calls Scheduled', target_value: 3, actual_value: 0, unit: 'count', status: 'Pending' },
    // Week 2
    { week_number: 2, date_range: 'May 18-24', metric_name: 'Discovery Calls Completed', target_value: 6, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 2, date_range: 'May 18-24', metric_name: 'Pilots Verbally Agreed', target_value: 2, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 2, date_range: 'May 18-24', metric_name: 'Pilots Signed', target_value: 1, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 2, date_range: 'May 18-24', metric_name: 'Investor Meetings Conducted', target_value: 3, actual_value: 0, unit: 'count', status: 'Pending' },
    // Week 3
    { week_number: 3, date_range: 'May 25-31', metric_name: 'Pilots Signed Total', target_value: 3, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 3, date_range: 'May 25-31', metric_name: 'Retailers Acquired', target_value: 50, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 3, date_range: 'May 25-31', metric_name: 'Investor Meetings Conducted', target_value: 4, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 3, date_range: 'May 25-31', metric_name: 'Partnership Proposals Sent', target_value: 1, actual_value: 0, unit: 'count', status: 'Pending' },
    // Week 4
    { week_number: 4, date_range: 'Jun 1-7', metric_name: 'Retailers Across Pilots', target_value: 300, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 4, date_range: 'Jun 1-7', metric_name: 'Pilot Revenue MRR (USD)', target_value: 12000, actual_value: 0, unit: 'currency', status: 'Pending' },
    { week_number: 4, date_range: 'Jun 1-7', metric_name: 'Investors Interested', target_value: 2, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 4, date_range: 'Jun 1-7', metric_name: 'Partnership Signed', target_value: 1, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 4, date_range: 'Jun 1-7', metric_name: 'Term Sheet Signed', target_value: 1, actual_value: 0, unit: 'count', status: 'Pending' },
    // Week 5
    { week_number: 5, date_range: 'Jun 8-14', metric_name: 'Total Funding Raised (USD)', target_value: 1_500_000, actual_value: 0, unit: 'currency', status: 'Pending' },
    { week_number: 5, date_range: 'Jun 8-14', metric_name: 'Total Retailers', target_value: 300, actual_value: 0, unit: 'count', status: 'Pending' },
    { week_number: 5, date_range: 'Jun 8-14', metric_name: 'Total Partnerships', target_value: 1, actual_value: 0, unit: 'count', status: 'Pending' },
  ];

  return metrics;
}

/**
 * Import CSV data to database via fetch
 */
export async function importCSVToTable(csvText, tableType, apiEndpoint) {
  const parsed = parseCSV(csvText);
  let successCount = 0;
  let errorCount = 0;

  for (const row of parsed) {
    try {
      let mapped;
      switch (tableType) {
        case 'prospects':
          mapped = mapProspectRow(row);
          break;
        case 'investors':
          mapped = mapInvestorRow(row);
          break;
        case 'partnerships':
          mapped = mapPartnershipRow(row);
          break;
        default:
          throw new Error(`Unknown table type: ${tableType}`);
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapped),
      });

      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
        console.warn(`Failed to import row:`, row, await response.text());
      }
    } catch (err) {
      errorCount++;
      console.error('Import error:', err);
    }
  }

  return { successCount, errorCount, total: parsed.length };
}
