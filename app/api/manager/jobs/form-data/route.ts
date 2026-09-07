import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;

  try {
    const servicesRes = await db.query(
      `SELECT s.id, s.name, s.description, s.price, s.points_earned, s.category
            FROM services s
            WHERE (s.branch_id = $1 OR s.branch_id IS NULL) AND s.is_active = TRUE
            ORDER BY s.category, s.name`,
      [branchId]
    );

    const offersRes = await db.query(
      `SELECT o.id, o.name, o.description, o.discount_type, o.discount_value, o.points_required, o.min_spend
            FROM offers o
            WHERE (o.branch_id = $1 OR o.branch_id IS NULL) 
              AND o.is_active = TRUE
            ORDER BY o.name`,
      [branchId]
    );

    const staffRes = await db.query(
      `SELECT id, name FROM users WHERE branch_id = $1 AND role = 'staff' AND is_active = TRUE ORDER BY name ASC`,
      [branchId]
    );

    return NextResponse.json({ 
      services: servicesRes.rows, 
      staff: staffRes.rows 
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
