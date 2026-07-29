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

  let dateModifier = "'-1 month'";
  if (range === "week") dateModifier = "'-7 days'";
  if (range === "year") dateModifier = "'-1 year'";

  try {
    // 1. Transaction Stats (Revenue, Count, Points Awarded)
    const txStatsRes = await db.execute({
      sql: `SELECT 
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as tx_count,
              COALESCE(SUM(points_awarded), 0) as points_awarded
            FROM transactions 
            WHERE branch_id = ? AND created_at >= datetime('now', ${dateModifier})`,
      args: [branchId],
    });

    const stats = txStatsRes.rows[0];

    // 1b. Points Redeemed
    const redeemStatsRes = await db.execute({
      sql: `SELECT COALESCE(SUM(points_redeemed), 0) as points_redeemed 
            FROM redemptions 
            WHERE branch_id = ? AND created_at >= datetime('now', ${dateModifier})`,
      args: [branchId],
    });
    
    const pointsRedeemed = redeemStatsRes.rows[0].points_redeemed;

    // 2. New Customers
    const customerStatsRes = await db.execute({
      sql: `SELECT COUNT(*) as new_customers 
            FROM customers 
            WHERE branch_id = ? AND created_at >= datetime('now', ${dateModifier})`,
      args: [branchId],
    });

    const newCustomers = customerStatsRes.rows[0].new_customers;

    // 3. Top 5 Services
    const topServicesRes = await db.execute({
      sql: `SELECT 
              s.name,
              COUNT(ts.id) as count,
              COALESCE(SUM(ts.price_at_time), 0) as revenue
            FROM transaction_services ts
            JOIN services s ON ts.service_id = s.id
            JOIN transactions t ON ts.transaction_id = t.id
            WHERE t.branch_id = ? AND t.created_at >= datetime('now', ${dateModifier})
            GROUP BY s.id, s.name
            ORDER BY count DESC
            LIMIT 5`,
      args: [branchId],
    });

    return NextResponse.json({
      revenue: stats.revenue,
      txCount: stats.tx_count,
      pointsAwarded: stats.points_awarded,
      pointsRedeemed: pointsRedeemed,
      newCustomers,
      topServices: topServicesRes.rows
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
