import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

export async function POST(req: NextRequest) {
  try {
    const { login_id, reset_id, reset_token, new_password } = await req.json();

    if (!login_id || !reset_id || !reset_token || !new_password) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Retrieve user by login_id first
    const userRes = await db.execute({
      sql: "SELECT id FROM users WHERE login_id = ?",
      args: [login_id],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const userId = userRes.rows[0].id;

    // Verify reset token
    const resetRes = await db.execute({
      sql: "SELECT user_id, token_hash, expires_at FROM password_resets WHERE id = ?",
      args: [reset_id],
    });

    if (resetRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 400 });
    }

    const reset = resetRes.rows[0];

    // EXPLICIT TOKEN OWNERSHIP CHECK
    if (reset.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: Token ownership mismatch" }, { status: 403 });
    }

    const expiresAt = new Date(reset.expires_at as string);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Session has expired" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(reset_token, reset.token_hash as string);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update user
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newPasswordHash, userId],
    });

    // Delete token
    await db.execute({
      sql: "DELETE FROM password_resets WHERE id = ?",
      args: [reset_id],
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("OTP Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
