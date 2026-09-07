import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ENFORCED SECURITY: Scope all queries strictly to the Manager's own branch.
  const branchId = (session.user as any).branch_id;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 100;
  const offset = (page - 1) * limit;

  let intervalStr = "1 month";
  if (range === "week") intervalStr = "7 days";
  if (range === "year") intervalStr = "1 year";

  try {
    const result = await db.query(
      `SELECT 
              t.id, 
              t.status, 
              t.total_amount,
              t.payment_method,
              t.created_at,
              t.claimed_at,
              t.finished_at,
              c.vehicle_model,
              c.vehicle_number,
              c.name as customer_name,
              u.name as assigned_staff_name,
              (SELECT s.name 
               FROM transaction_services ts 
               JOIN services s ON ts.service_id = s.id 
               WHERE ts.transaction_id = t.id 
               LIMIT 1) as service_name
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.staff_id = u.id
            WHERE t.branch_id = $1 AND t.created_at >= NOW() - INTERVAL '${intervalStr}'
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3`,
      [branchId, limit, offset]
    );

    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    console.error("Error fetching manager jobs:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
