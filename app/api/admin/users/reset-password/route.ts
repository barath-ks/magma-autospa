import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, newLoginId, newPassword, requirePasswordChange } = await req.json();
    
    // Prevent editing admins
    const targetUser = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [userId]
    });
    
    if (!targetUser.rows.length || targetUser.rows[0].role === "admin") {
      return NextResponse.json({ error: "Cannot reset admin accounts or invalid user." }, { status: 403 });
    }

    // 1. Hash the new password provided by the Admin
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const mustChange = requirePasswordChange ? 1 : 0;

    // 2. Save it securely to the database alongside the must_change_password flag
    await db.execute({
      sql: `UPDATE users 
            SET password_hash = ?, login_id = ?, must_change_password = ? 
            WHERE id = ?`,
      args: [hashedPassword, newLoginId, mustChange, userId]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset password error", error);
    if (error.message?.includes("UNIQUE constraint failed: users.login_id")) {
      return NextResponse.json({ error: "Login ID already taken" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error updating credentials" }, { status: 500 });
  }
}
