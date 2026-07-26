import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const branchRes = await db.execute({
      sql: "SELECT id, name, location FROM branches WHERE id = ?",
      args: [params.id]
    });

    if (branchRes.rows.length === 0) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const branch = branchRes.rows[0];

    const usersRes = await db.execute({
      sql: `SELECT id, login_id, name, role, phone, email, created_at 
            FROM users 
            WHERE branch_id = ? AND role IN ('staff', 'manager')
            ORDER BY role, created_at DESC`,
      args: [params.id]
    });

    return NextResponse.json({ branch, users: usersRes.rows });
  } catch (error) {
    console.error("Error fetching branch details:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
