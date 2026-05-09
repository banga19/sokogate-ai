import { queryProducts } from "@/app/api/utils/productSql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const result = await queryProducts(
      `SELECT * FROM products WHERE id = $1 AND is_active = true`,
      [parseInt(id)]
    );

    if (!result || result.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error("Product GET error:", error);
    if (error.message?.includes('relation') || error.code === '42P01') {
      return Response.json({ 
        error: "Products table not initialized. Please run the database schema migration." 
      }, { status: 503 });
    }
    return Response.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
