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
  if (role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const branchId = (session.user as any).branch_id;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";

  let intervalStr = "1 month";
  let prevIntervalStr = "2 months";
  if (range === "week") {
    intervalStr = "7 days";
    prevIntervalStr = "14 days";
  }
  if (range === "year") {
    intervalStr = "1 year";
    prevIntervalStr = "2 years";
  }

  const branchFilter = isAdmin ? "" : "branch_id = $1 AND ";
  const tBranchFilter = isAdmin ? "" : "t.branch_id = $1 AND ";
  const args = isAdmin ? [] : [branchId];

  try {
    // 1. Transaction Stats (Revenue, Count, Points Awarded)
    const txStatsRes = await db.query(
      `SELECT 
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as tx_count,
              COALESCE(SUM(points_awarded), 0) as points_awarded
            FROM transactions 
            WHERE ${branchFilter}created_at >= NOW() - INTERVAL '${intervalStr}'`,
      args
    );

    const stats = txStatsRes.rows[0];

    // 1b. Points Redeemed
    const redeemStatsRes = await db.query(
      `SELECT COALESCE(SUM(points_redeemed), 0) as points_redeemed 
            FROM redemptions 
            WHERE ${branchFilter}created_at >= NOW() - INTERVAL '${intervalStr}'`,
      args
    );
    
    const pointsRedeemed = redeemStatsRes.rows[0].points_redeemed;

    // 2. New Customers
    const customerStatsRes = await db.query(
      `SELECT COUNT(*) as new_customers 
            FROM customers 
            WHERE ${branchFilter}created_at >= NOW() - INTERVAL '${intervalStr}'`,
      args
    );

    const newCustomers = customerStatsRes.rows[0].new_customers;

    // 3. Top 5 Services
    const topServicesRes = await db.query(
      `SELECT 
              s.name,
              COUNT(ts.id) as count,
              COALESCE(SUM(ts.price_at_time), 0) as revenue
            FROM transaction_services ts
            JOIN services s ON ts.service_id = s.id
            JOIN transactions t ON ts.transaction_id = t.id
            WHERE ${tBranchFilter}t.created_at >= NOW() - INTERVAL '${intervalStr}'
            GROUP BY s.id, s.name
            ORDER BY count DESC
            LIMIT 5`,
      args
    );

    // 4. Previous Period Revenue
    const prevTxStatsRes = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as prev_revenue
            FROM transactions 
            WHERE ${branchFilter}created_at >= NOW() - INTERVAL '${prevIntervalStr}'
              AND created_at < NOW() - INTERVAL '${intervalStr}'`,
      args
    );
    const prevRevenue = prevTxStatsRes.rows[0].prev_revenue;
    let revenueGrowth = null; // null indicates no previous data to compare against
    if (prevRevenue > 0) {
      revenueGrowth = ((Number(stats.revenue) - Number(prevRevenue)) / Number(prevRevenue)) * 100;
    }

    // 5. Repeat Visit Rate (Using finished transactions only)
    const repeatRes = await db.query(
      `
        SELECT 
          COUNT(customer_id) as total_unique,
          SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END) as repeat_customers
        FROM (
          SELECT customer_id, COUNT(*) as visit_count
          FROM transactions
          WHERE ${branchFilter}created_at >= NOW() - INTERVAL '${intervalStr}' AND status = 'finished'
          GROUP BY customer_id
        ) sub
      `,
      args
    );
    
    const totalUnique = Number(repeatRes.rows[0]?.total_unique || 0);
    const repeatCustomers = Number(repeatRes.rows[0]?.repeat_customers || 0);
    const repeatVisitRate = totalUnique > 0 ? (repeatCustomers / totalUnique) * 100 : 0;

    // 6. Average Ticket Size (Aligning exactly with total Revenue / total Transactions shown)
    const avgTicketSize = Number(stats.tx_count) > 0 ? Number(stats.revenue) / Number(stats.tx_count) : 0;

    return NextResponse.json({
      revenue: stats.revenue,
      txCount: stats.tx_count,
      pointsAwarded: stats.points_awarded,
      pointsRedeemed: pointsRedeemed,
      newCustomers,
      topServices: topServicesRes.rows,
      revenueGrowth,
      avgTicketSize,
      repeatVisitRate
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
