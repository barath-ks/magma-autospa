import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "@/lib/password-strength";
import { checkPasswordReuse } from "@/lib/password-history";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { reset_id, reset_token, new_password } = await req.json();

    if (!reset_id || !reset_token || !new_password) {
      return NextResponse.json(
        { error: "Reset token, session identifier, and new password are required" },
        { status: 400 }
      );
    }

    // Retrieve reset session
    const resetRes = await db.execute({
      sql: "SELECT user_id, token_hash, expires_at FROM password_resets WHERE id = ?",
      args: [reset_id],
    });

    if (resetRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset session. Please restart the password reset process." },
        { status: 400 }
      );
    }

    const resetRecord = resetRes.rows[0];
    const expiresAt = new Date(resetRecord.expires_at as string);

    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Password reset session has expired. Please restart the process." },
        { status: 400 }
      );
    }

    // Verify token hash
    const isTokenValid = await bcrypt.compare(reset_token, resetRecord.token_hash as string);
    if (!isTokenValid) {
      return NextResponse.json(
        { error: "Invalid reset token. Security validation failed." },
        { status: 403 }
      );
    }

    const userId = resetRecord.user_id as string;

    // Fetch user details
    const userRes = await db.execute({
      sql: "SELECT id, login_id, role, password_hash FROM users WHERE id = ?",
      args: [userId],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUser = userRes.rows[0];

    // Validate password strength
    const strengthCheck = validatePasswordStrength(new_password);
    if (!strengthCheck.valid) {
      return NextResponse.json({ error: strengthCheck.error }, { status: 400 });
    }

    // Validate password reuse
    const isReused = await checkPasswordReuse(
      userId,
      new_password,
      currentUser.password_hash as string
    );
    if (isReused) {
      return NextResponse.json(
        { error: "You cannot reuse a previously used password. Please choose a new, unique password." },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const historyId = uuidv4();

    // Execute atomic update: update user password, remove must_change_password flag, record history, and consume reset token
    await db.batch([
      {
        sql: "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        args: [hashedPassword, userId],
      },
      {
        sql: "INSERT INTO password_history (id, user_id, password_hash) VALUES (?, ?, ?)",
        args: [historyId, userId, hashedPassword],
      },
      {
        sql: "DELETE FROM password_resets WHERE id = ?",
        args: [reset_id],
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset. You may now sign in with your new credentials.",
      role: currentUser.role,
      login_id: currentUser.login_id,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
