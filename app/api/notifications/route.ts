import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = (session.user as any).role;
  const branchId = (session.user as any).branch_id;

  try {
    let staffScheduleBadge = 0;
    let managerScheduleBadge = 0;

    if (role === "staff") {
      const res = await db.execute({
        sql: `SELECT COUNT(*) as count FROM shift_requests WHERE staff_id = ? AND status != 'pending' AND staff_viewed = 0`,
        args: [userId],
      });
      staffScheduleBadge = res.rows[0].count as number;
    }

    if (role === "manager") {
      const res = await db.execute({
        sql: `SELECT COUNT(*) as count FROM shift_requests WHERE branch_id = ? AND status = 'pending'`,
        args: [branchId],
      });
      managerScheduleBadge = res.rows[0].count as number;
    }

    return NextResponse.json({ staffScheduleBadge, managerScheduleBadge });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
