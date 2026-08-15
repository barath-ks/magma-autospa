import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager" && (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;

  try {
    const res = await db.execute({
      sql: `SELECT * FROM offers WHERE branch_id = ? AND is_active = 1 ORDER BY points_required ASC`,
      args: [branchId],
    });

    return NextResponse.json({ offers: res.rows });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
