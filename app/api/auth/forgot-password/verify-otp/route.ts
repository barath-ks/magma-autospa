import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { identifier, otp } = await req.json();

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json({ error: "Please enter a valid 6-digit verification code" }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim();
    const cleanOtp = otp.trim();

    // Look up user by login_id, phone, or email
    const userRes = await db.query(
      `SELECT id, login_id, name, role 
            FROM users 
            WHERE (LOWER(login_id) = LOWER($1) OR phone = $2 OR LOWER(email) = LOWER($3)) AND is_active = TRUE 
            LIMIT 1`,
      [cleanIdentifier, cleanIdentifier, cleanIdentifier]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    // Find the latest unused password_reset OTP for this user
    const otpRes = await db.query(
      `SELECT id, code_hash, expires_at 
            FROM otp_codes 
            WHERE user_id = $1 AND used = 0 AND purpose = 'password_reset' 
            ORDER BY created_at DESC 
            LIMIT 1`,
      [user.id]
    );

    if (otpRes.rows.length === 0) {
      return NextResponse.json({ error: "No active verification code found. Please request a new code." }, { status: 400 });
    }

    const otpRecord = otpRes.rows[0];
    const expiresAt = new Date(otpRecord.expires_at as string);

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.code_hash as string);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid verification code. Please check and try again." }, { status: 400 });
    }

    // Mark OTP as used
    await db.query(
      "UPDATE otp_codes SET used = 1 WHERE id = $1",
      [otpRecord.id]
    );

    // Generate a secure reset session token (valid for 15 minutes)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawResetToken, 10);
    const resetSessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const resetId = crypto.randomUUID();

    // Clean up any pending resets for this user
    await db.query(
      "DELETE FROM password_resets WHERE user_id = $1",
      [user.id]
    );

    // Store new password reset token
    await db.query(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at) 
            VALUES ($1, $2, $3, $4)`,
      [resetId, user.id, tokenHash, resetSessionExpiresAt]
    );

    return NextResponse.json({
      success: true,
      message: "Code verified successfully",
      reset_id: resetId,
      reset_token: rawResetToken,
      login_id: user.login_id,
      role: user.role,
    });
  } catch (error) {
    console.error("Forgot password verify-otp error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
