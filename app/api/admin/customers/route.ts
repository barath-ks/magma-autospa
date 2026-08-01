import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  
  // Strict 403 Rejection for Staff and Managers
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sortBy = searchParams.get("sortBy") || "last_visit";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const limit = 15;
  const offset = (page - 1) * limit;

  // Validate sort parameters to prevent SQL injection
  const validSortColumns = ['name', 'last_visit', 'total_spent'];
  const validSortOrders = ['asc', 'desc'];
  
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'last_visit';
  const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

  try {
    let whereClause = "";
    let args: any[] = [];

    if (search.trim() !== "") {
      const searchTerm = `%${search}%`;
      whereClause = "WHERE (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)";
      args = [searchTerm, searchTerm, searchTerm];
    }

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as total FROM customers c ${whereClause}`,
      args: args
    });
    
    const totalRecords = countRes.rows[0].total as number;
    const totalPages = Math.ceil(totalRecords / limit);

    // Append pagination args
    args.push(limit, offset);

    const result = await db.execute({
      sql: `
        SELECT 
          c.id, c.name, c.phone, c.email, c.created_at,
          COUNT(t.id) as total_visits,
          MAX(t.created_at) as last_visit,
          COALESCE(SUM(t.total_amount), 0) as total_spent,
          GROUP_CONCAT(DISTINCT b.name) as branches_visited
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'finished'
        LEFT JOIN branches b ON t.branch_id = b.id
        ${whereClause}
        GROUP BY c.id
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
      `,
      args: args,
    });

    return NextResponse.json({ 
      customers: result.rows,
      pagination: {
        total: totalRecords,
        pages: totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching admin customers:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
