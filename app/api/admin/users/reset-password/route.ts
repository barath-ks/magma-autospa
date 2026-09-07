import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkPasswordReuse } from "@/lib/password-history";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, newLoginId, newPassword, requirePasswordChange } = await req.json();
    
    // Prevent editing admins
    const targetUser = await db.query(
      "SELECT role, password_hash FROM users WHERE id = $1",
      [userId]
    );
    
    if (!targetUser.rows.length || targetUser.rows[0].role === "admin") {
      return NextResponse.json({ error: "Cannot reset admin accounts or invalid user." }, { status: 403 });
    }

    const isReused = await checkPasswordReuse(userId, newPassword, targetUser.rows[0].password_hash as string);
    if (isReused) {
      return NextResponse.json({ error: "This password has been used before, please choose a different one" }, { status: 400 });
    }

    // 1. Hash the new password provided by the Admin
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const mustChange = requirePasswordChange ? 1 : 0;

    // 2. Save it securely to the database alongside the must_change_password flag
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO password_history (id, user_id, password_hash) VALUES ($1, $2, $3)",
        [uuidv4(), userId, hashedPassword]
      );
      await client.query(
        `UPDATE users 
              SET password_hash = $1, login_id = $2, must_change_password = $3 
              WHERE id = $4`,
        [hashedPassword, newLoginId, mustChange, userId]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset password error", error);
    if (error.message?.includes("UNIQUE constraint failed: users.login_id")) {
      return NextResponse.json({ error: "Login ID already taken" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error updating credentials" }, { status: 500 });
  }
}
