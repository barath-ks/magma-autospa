import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/email";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0] || ""}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const { login_id } = await req.json();
    if (!login_id) {
      return NextResponse.json({ error: "Login ID is required" }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT id, name, role, phone, email FROM users WHERE login_id = ?",
      args: [login_id],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ message: "If that ID is registered, an OTP was sent." });
    }

    const user = userRes.rows[0];

    if (!user.email) {
      return NextResponse.json(
        { error: "No registered email on file — contact your administrator to reset your password." },
        { status: 400 }
      );
    }

    const emailStr = String(user.email).trim();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpId = crypto.randomUUID();

    // Invalidate existing unused password_reset OTPs
    await db.execute({
      sql: `UPDATE otp_codes SET used = 1 WHERE user_id = ? AND purpose = 'password_reset' AND used = 0`,
      args: [user.id],
    });

    await db.execute({
      sql: `INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at, used) VALUES (?, ?, 'email', ?, 'password_reset', ?, 0)`,
      args: [otpId, user.id, otpHash, expiresAt],
    });

    // Send OTP via unified email service
    await sendOtpEmail(emailStr, otp, {
      purpose: "password_reset",
      recipientName: user.name as string,
    });

    return NextResponse.json({ 
      success: true, 
      role: user.role,
      masked_email: maskEmail(emailStr),
      message: `Verification code sent to registered email (${maskEmail(emailStr)}).`
    });
  } catch (error) {
    console.error("OTP Request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
