import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;

  try {
    const staffRes = await db.query(
      "SELECT id, login_id, name, email, phone, role, is_active, is_available FROM users WHERE branch_id = $1 AND role = 'staff' AND is_active = TRUE",
      [branchId]
    );

    return NextResponse.json({ staff: staffRes.rows });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
