import sql from "@/app/api/utils/sql";
import { serverEvents } from "@/server/pubsub";
import { ok, error, validationError, notFound } from "@/app/api/utils/apiResponse";
import { requireUser, requireAdmin } from "@/app/api/utils/adminAuth";

export async function GET(request) {
  try {
    // Admin authentication for listing all leads
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');
    const score = searchParams.get('score');

    let query = `SELECT * FROM leads`;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (score) {
      conditions.push(`score = $${params.length + 1}`);
      params.push(score);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const leads = await sql(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM leads';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await sql(countQuery, params.slice(0, -2));
    const total = countResult[0]?.total || 0;

    return ok({ leads }, null, {
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return error("Failed to fetch leads", 500);
  }
}

export async function POST(request) {
  // Accept any valid authenticated session (non-admin users can add leads)
  const auth = await requireUser(request);
  if (!auth.success) {
    return error(auth.error, auth.status);
  }

  try {
    const { name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, source } =
      await request.json();

    if (!name || !email) {
      return validationError({ name: 'Required', email: 'Required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationError({ email: 'Invalid email format' });
    }

    const validScores = ['High', 'Medium', 'Low'];
    const scoreValue = score || 'Medium';
    if (!validScores.includes(scoreValue)) {
      return validationError({ score: 'Must be High, Medium, or Low' });
    }

    const newLead = await sql`
      INSERT INTO leads (name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, source)
      VALUES (${name}, ${email}, ${phone}, ${whatsapp}, ${message}, ${scoreValue}, ${intent_summary}, ${category}, ${keyword_score}, ${source || 'manual'})
      RETURNING *
    `;

    serverEvents.emitLead(newLead[0]);

    return ok(newLead[0]);
  } catch (err) {
    console.error(err);
    return error("Failed to create lead", 500);
  }
}

export async function PATCH(request) {
  // Admin authentication for lead updates
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return error(auth.error, auth.status);
  }

  try {
    const { id, status, payment_status, shipping_status, shipping_tracking_number } = await request.json();

    if (status !== undefined) {
      const updated = await sql`UPDATE leads SET status = ${status} WHERE id = ${id} RETURNING *`;
      if (updated.length === 0) return notFound("Lead not found");
      serverEvents.emitLeadUpdate(updated[0]);
      return ok(updated[0]);
    }
    if (payment_status !== undefined) {
      const updated = await sql`UPDATE leads SET payment_status = ${payment_status} WHERE id = ${id} RETURNING *`;
      if (updated.length === 0) return notFound("Lead not found");
      serverEvents.emitLeadUpdate(updated[0]);
      return ok(updated[0]);
    }
    if (shipping_status !== undefined) {
      const updated = await sql`UPDATE leads SET shipping_status = ${shipping_status} WHERE id = ${id} RETURNING *`;
      if (updated.length === 0) return notFound("Lead not found");
      serverEvents.emitLeadUpdate(updated[0]);
      return ok(updated[0]);
    }
    if (shipping_tracking_number !== undefined) {
      const updated = await sql`UPDATE leads SET shipping_tracking_number = ${shipping_tracking_number} WHERE id = ${id} RETURNING *`;
      if (updated.length === 0) return notFound("Lead not found");
      serverEvents.emitLeadUpdate(updated[0]);
      return ok(updated[0]);
    }

    return error("No valid fields to update", 400);
  } catch (err) {
    console.error(err);
    return error("Failed to update lead", 500);
  }
}
