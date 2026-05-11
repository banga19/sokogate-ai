/**
 * CSV Import Utility for Sales & Funding Data
 * Uses PapaParse for robust CSV parsing
 */

import Papa from 'papaparse';

/**
 * Parse CSV text into array of objects
 * Uses PapaParse for proper handling of quoted fields, delimiters, etc.
 * Returns array of row objects synchronously.
 */
export function parseCSV(csvText) {
  let result = [];
  try {
    // PapaParse is async but we need sync result - use synchronous mode
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      trimHeaders: true,
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
    });
    result = parsed.data;
  } catch (err) {
    console.error('CSV parsing failed:', err);
  }
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

export function mapLeadRow(row) {
  // Normalize score values
  const normalizeScore = (val) => {
    const v = (val || '').toLowerCase().trim();
    if (v === 'high') return 'High';
    if (v === 'medium') return 'Medium';
    if (v === 'low') return 'Low';
    return 'Medium'; // default
  };

  // Get field value flexibly (try multiple possible column names)
  const getField = (possibleNames, defaultValue = '') => {
    // First pass: try exact names
    for (const name of possibleNames) {
      const val = row[name];
      if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
    // Second pass: try lowercase versions of the column names
    for (const name of possibleNames) {
      const lowerName = name.toLowerCase();
      if (lowerName !== name) {
        const val = row[lowerName];
        if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    }
    // Third pass: try case-insensitive search through all row keys
    const rowKeys = Object.keys(row);
    for (const name of possibleNames) {
      const match = rowKeys.find(k => k.toLowerCase() === name.toLowerCase());
      if (match) {
        const val = row[match];
        if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    }
    return defaultValue;
  };

  const name = getField(['NAME', 'Name', 'name', 'FULL NAME', 'FULL_NAME', 'full_name', 'CONTACT NAME', 'CONTACT_NAME', 'contact_name', 'CONTACT', 'Contact', 'contact']);
  const email = getField(['EMAIL', 'Email', 'email', 'E-MAIL', 'E_MAIL', 'e_mail', 'MAIL', 'mail']);
  const phone = getField(['PHONE', 'Phone', 'phone', 'PHONE NUMBER', 'PHONE_NUMBER', 'phone_number', 'MOBILE', 'mobile', 'CELL', 'cell', 'TEL', 'tel']);
  const whatsapp = getField(['WHATSAPP', 'Whatsapp', 'whatsapp', 'WHATSAPP NUMBER', 'WHATSAPP_NUMBER', 'whatsapp_number', 'WA', 'wa', 'WHATSAPP NO', 'WHATSAPP_NO']);
  const message = getField(['MESSAGE', 'Message', 'message', 'NOTES', 'Notes', 'notes', 'DESCRIPTION', 'description', 'COMMENTS', 'comments']);
  const score = normalizeScore(getField(['SCORE', 'Score', 'score', 'LEAD SCORE', 'LEAD_SCORE', 'lead_score', 'PRIORITY', 'priority', 'RATING', 'rating']) || 'Medium');
  const intent_summary = getField(['INTENT_SUMMARY', 'Intent_summary', 'intent_summary', 'INTENT', 'Intent', 'intent', 'REQUIREMENTS', 'requirements', 'NEED', 'need', 'PURPOSE', 'purpose']);
  const category = getField(['CATEGORY', 'Category', 'category', 'TYPE', 'Type', 'type', 'INDUSTRY', 'Industry', 'industry', 'SECTOR', 'sector', 'FIELD', 'field']);

  return {
    name,
    email,
    phone,
    whatsapp,
    message,
    score,
    intent_summary,
    category,
    keyword_score: score, // Default keyword_score to same as score
    source: 'csv_import',
    status: 'New', // default status for imported leads
   };
 }

/**
 * Validate a lead object
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateLead(lead, rowNumber) {
  if (!lead.name || lead.name.trim() === '') {
    return `Row ${rowNumber}: Name is required`;
  }
  if (!lead.email || lead.email.trim() === '') {
    return `Row ${rowNumber}: Email is required`;
  }
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lead.email)) {
    return `Row ${rowNumber}: Invalid email format (${lead.email})`;
  }
  // Validate score enum
  if (!['High', 'Medium', 'Low'].includes(lead.score)) {
    return `Row ${rowNumber}: Invalid score '${lead.score}' (must be High, Medium, or Low)`;
  }
  return null;
}

/**
 * Import CSV data to database via fetch (existing generic importer)
 */
export async function importCSVToTable(csvText, tableType, apiEndpoint) {
  const parsed = parseCSV(csvText);
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    const rowNum = i + 2; // account for header row

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
        case 'leads':
          mapped = mapLeadRow(row);
          const validationError = validateLead(mapped, rowNum);
          if (validationError) {
            errorCount++;
            errors.push(validationError);
            continue;
          }
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
        const errorText = await response.text();
        errors.push(`Row ${rowNum}: ${errorText || 'Failed to import'}`);
      }
    } catch (err) {
      errorCount++;
      errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  return { successCount, errorCount, total: parsed.length, errors };
}
