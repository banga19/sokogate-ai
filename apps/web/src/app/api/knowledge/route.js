import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/adminAuth";
import { invalidateKnowledgeCache } from "@/app/api/utils/knowledgeCache";

// GET /api/knowledge?category=electronics&limit=20
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") !== "false";
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = `
      SELECT id, category, question, answer, tags, priority, is_active, last_updated, updated_by
      FROM knowledge_base
    `;
    const conditions = [];
    const params = [];

    if (activeOnly) {
      conditions.push(`is_active = TRUE`);
    }

    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY priority DESC, category LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await sql(query, params);

    return Response.json({ knowledge: result });
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/knowledge - Admin only
export async function POST(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { category, question, answer, tags, priority, is_active, updated_by, id } = await request.json();

    if (!category || !answer) {
      return Response.json(
        { error: "Category and answer are required" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing
      const [result] = await sql`
        UPDATE knowledge_base
        SET category = ${category},
            question = ${question || null},
            answer = ${answer},
            tags = ${tags || null},
            priority = ${priority || 0},
            is_active = ${is_active !== false},
            updated_by = ${updated_by || 'admin'},
            last_updated = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!result[0]) {
        return Response.json({ error: "Knowledge entry not found" }, { status: 404 });
      }
      invalidateKnowledgeCache();
      return Response.json({ knowledge: result[0], action: "updated" });
    } else {
      // Insert new
      const [result] = await sql`
        INSERT INTO knowledge_base (category, question, answer, tags, priority, is_active, updated_by)
        VALUES (${category}, ${question || null}, ${answer}, ${tags || null}, ${priority || 0}, ${is_active !== false}, ${updated_by || 'admin'})
        RETURNING *
      `;
      invalidateKnowledgeCache();
      return Response.json({ knowledge: result[0], action: "created" });
    }
  } catch (error) {
    console.error("Error saving knowledge base:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}

// DELETE /api/knowledge?id=123 - Admin only
export async function DELETE(request) {
  // Admin authentication
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id"));

    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }

    const result = await sql`DELETE FROM knowledge_base WHERE id = ${id} RETURNING id`;
    if (result.length === 0) {
      return Response.json({ error: "Knowledge entry not found" }, { status: 404 });
    }
    invalidateKnowledgeCache();
    return Response.json({ success: true, action: "deleted" });
  } catch (error) {
    console.error("Error deleting knowledge base entry:", error);
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
}