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
    const result = await db.execute({
      sql: `SELECT id, login_id, name, phone, email, created_at FROM users 
            WHERE branch_id = ? AND role = 'staff'
            ORDER BY created_at DESC`,
      args: [branchId],
    });

    return NextResponse.json({ staff: result.rows });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
