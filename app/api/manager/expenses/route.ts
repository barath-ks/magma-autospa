import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Managers or Admins can view expenses." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";
  
  // Scoping logic
  let branchId = (session.user as any).branch_id;
  if (role === "admin") {
    const adminBranchQuery = searchParams.get("branch_id");
    if (adminBranchQuery) {
      branchId = adminBranchQuery;
    } else {
      // If admin doesn't provide branch_id, they could get all branches, but the user specifies:
      // "Admin can GET expenses for any branch" 
      // If we need to support fetching ALL expenses, we would need to dynamically build the SQL. 
      // Let's implement it flexibly.
      branchId = null; // null means fetch all branches for admin
    }
  }

  let dateModifier = "'-1 month'";
  if (range === "week") dateModifier = "'-7 days'";
  if (range === "year") dateModifier = "'-1 year'";

  try {
    let listSql = `
      SELECT e.*, u.name as entered_by_name 
      FROM branch_expenses e 
      JOIN users u ON e.entered_by = u.id 
      WHERE e.created_at >= datetime('now', ${dateModifier})
    `;
    let sumSql = `
      SELECT COALESCE(SUM(amount), 0) as total_sum 
      FROM branch_expenses 
      WHERE created_at >= datetime('now', ${dateModifier})
    `;
    const args: string[] = [];

    if (branchId) {
      listSql += ` AND e.branch_id = ?`;
      sumSql += ` AND branch_id = ?`;
      args.push(branchId);
    }
    
    listSql += ` ORDER BY e.created_at DESC`;

    const listRes = await db.execute({ sql: listSql, args });
    const sumRes = await db.execute({ sql: sumSql, args });

    return NextResponse.json({
      expenses: listRes.rows,
      totalSum: sumRes.rows[0].total_sum
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Forbidden: Only Managers can submit expenses." }, { status: 403 });
  }

  const branchId = (session.user as any).branch_id;
  const userId = session.user.id;

  try {
    const body = await request.json();
    const { description, amount } = body;

    if (!description || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid description or amount" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO branch_expenses (id, branch_id, description, amount, entered_by, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [id, branchId, description, parseFloat(amount), userId]
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
