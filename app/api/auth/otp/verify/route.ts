import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

export async function POST(req: NextRequest) {
  try {
    const { login_id, phone_otp, email_otp } = await req.json();

    if (!login_id || !phone_otp) {
      return NextResponse.json({ error: "Login ID and Phone OTP are required" }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT id, role FROM users WHERE login_id = ?",
      args: [login_id],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid login ID or OTP" }, { status: 400 });
    }

    const user = userRes.rows[0];

    if (user.role === 'admin' && !email_otp) {
      return NextResponse.json({ error: "Email OTP is also required for Admin accounts" }, { status: 400 });
    }

    // Verify Phone OTP
    const phoneOtpRes = await db.execute({
      sql: `SELECT id, code_hash, expires_at 
            FROM otp_codes 
            WHERE user_id = ? AND channel = 'phone' AND used = 0 AND purpose = 'password_reset'
            ORDER BY created_at DESC LIMIT 1`,
      args: [user.id]
    });

    if (phoneOtpRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired Phone OTP" }, { status: 400 });
    }

    const phoneCodeData = phoneOtpRes.rows[0];
    if (new Date(phoneCodeData.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "Phone OTP expired" }, { status: 400 });
    }

    const isPhoneMatch = await bcrypt.compare(phone_otp, phoneCodeData.code_hash as string);
    if (!isPhoneMatch) {
      return NextResponse.json({ error: "Invalid Phone OTP" }, { status: 400 });
    }

    let emailCodeData = null;

    // Verify Email OTP for Admin
    if (user.role === 'admin') {
      const emailOtpRes = await db.execute({
        sql: `SELECT id, code_hash, expires_at 
              FROM otp_codes 
              WHERE user_id = ? AND channel = 'email' AND used = 0 AND purpose = 'password_reset'
              ORDER BY created_at DESC LIMIT 1`,
        args: [user.id]
      });

      if (emailOtpRes.rows.length === 0) {
        return NextResponse.json({ error: "Invalid or expired Email OTP" }, { status: 400 });
      }

      emailCodeData = emailOtpRes.rows[0];
      if (new Date(emailCodeData.expires_at as string) < new Date()) {
        return NextResponse.json({ error: "Email OTP expired" }, { status: 400 });
      }

      const isEmailMatch = await bcrypt.compare(email_otp, emailCodeData.code_hash as string);
      if (!isEmailMatch) {
        return NextResponse.json({ error: "Invalid Email OTP" }, { status: 400 });
      }
    }

    // Mark as used
    await db.execute({
      sql: "UPDATE otp_codes SET used = 1 WHERE id = ?",
      args: [phoneCodeData.id]
    });

    if (emailCodeData) {
      await db.execute({
        sql: "UPDATE otp_codes SET used = 1 WHERE id = ?",
        args: [emailCodeData.id]
      });
    }

    // Generate a temporary reset token (valid for 10 minutes)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawResetToken, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const resetId = crypto.randomUUID();

    // Use existing password_resets table logic for the final stage
    await db.execute({
      sql: "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      args: [resetId, user.id, tokenHash, expiresAt],
    });

    return NextResponse.json({ 
      success: true,
      reset_token: rawResetToken,
      reset_id: resetId
    });
  } catch (error) {
    console.error("OTP Verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
