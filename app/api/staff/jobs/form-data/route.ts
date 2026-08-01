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
    const servicesRes = await db.execute({
      sql: `SELECT id, name, price FROM services WHERE is_active = 1 ORDER BY name ASC`
    });

    const staffRes = await db.execute({
      sql: `SELECT id, name FROM users WHERE branch_id = ? AND role = 'staff' AND is_active = 1 ORDER BY name ASC`,
      args: [branchId]
    });

    return NextResponse.json({ 
      services: servicesRes.rows, 
      staff: staffRes.rows 
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
