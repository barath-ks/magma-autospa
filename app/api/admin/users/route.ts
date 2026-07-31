import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.execute("SELECT id, login_id, email, role, branch_id, created_at, must_change_password FROM users WHERE role IN ('staff', 'manager') AND is_active = 1");
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("GET users error", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
