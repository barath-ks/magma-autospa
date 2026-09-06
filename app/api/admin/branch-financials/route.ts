import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can view branch financials." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";
  const branchId = searchParams.get("branch_id");

  let dateFilterTransactions = "";
  let dateFilterExpenses = "";

  if (range !== "all") {
    let dateModifier = "'-1 month'";
    if (range === "week") dateModifier = "'-7 days'";
    if (range === "year") dateModifier = "'-1 year'";
    
    dateFilterTransactions = `AND t.created_at >= datetime('now', ${dateModifier})`;
    dateFilterExpenses = `AND e.created_at >= datetime('now', ${dateModifier})`;
  }

  try {
    let sql = `
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        b.location as location,
        b.is_active as is_active,
        COALESCE(SUM(t.total_amount), 0) as revenue,
        COALESCE(
          (SELECT SUM(amount) FROM branch_expenses e WHERE e.branch_id = b.id ${dateFilterExpenses}),
          0
        ) as expense
      FROM branches b
      LEFT JOIN transactions t ON t.branch_id = b.id ${dateFilterTransactions}
    `;
    
    const args: any[] = [];
    if (branchId) {
      sql += ` WHERE b.id = ? `;
      args.push(branchId);
    }
    
    sql += ` GROUP BY b.id, b.name ORDER BY b.name ASC`;

    const res = await db.execute({ sql, args });

    const financials = res.rows.map((row: any) => ({
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      location: row.location,
      is_active: Boolean(row.is_active),
      revenue: row.revenue,
      expense: row.expense,
      profit: row.revenue - row.expense
    }));

    return NextResponse.json({ financials });
  } catch (error) {
    console.error("Error fetching branch financials:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
