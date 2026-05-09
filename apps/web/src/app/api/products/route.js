import { queryProducts } from "@/app/api/utils/productSql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit")) || 20;
    const offset = parseInt(searchParams.get("offset")) || 0;

    // Build WHERE conditions and parameter array
    const conditions = [];
    const params = [];

    conditions.push("is_active = true");

    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : "";
    const query = `
      SELECT * FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const products = await queryProducts(query, params);

    // Count total (reuse same WHERE conditions)
    const countQuery = `SELECT COUNT(*) FROM products ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countRows = await queryProducts(countQuery, params.slice(0, -2));
    const total = countRows[0] ? parseInt(countRows[0].count) : 0;

    return Response.json({
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Products GET error:", error);
    // Check if products table doesn't exist yet
    if (error.message?.includes('relation') || error.code === '42P01') {
      return Response.json({ 
        error: "Products table not initialized. Please run the database schema migration." 
      }, { status: 503 });
    }
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
