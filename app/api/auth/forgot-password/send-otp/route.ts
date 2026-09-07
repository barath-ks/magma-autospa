import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendOtpEmail } from "@/lib/email";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskIdentifier(val: string): string {
  if (!val) return "";
  if (val.includes("@")) {
    const [user, domain] = val.split("@");
    if (user.length <= 2) return `${user[0] || ""}***@${domain}`;
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  }
  const digits = val.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `••••••••${digits.slice(-4)}`;
  }
  return val;
}

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json({ error: "Please enter your username, registered phone number, or email" }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim();

    // Query user by username (login_id), phone, or email
    const userRes = await db.query(
      `SELECT id, login_id, name, phone, email, role, is_active 
            FROM users 
            WHERE (LOWER(login_id) = LOWER($1) OR phone = $2 OR LOWER(email) = LOWER($3)) AND is_active = TRUE 
            LIMIT 1`,
      [cleanIdentifier, cleanIdentifier, cleanIdentifier]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: "No active account found with that identifier" },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];
    const emailStr = user.email ? String(user.email).trim() : null;

    if (!emailStr) {
      return NextResponse.json(
        { error: "No registered email address found for this account. Please contact an administrator to update your contact details." },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
    const otpId = crypto.randomUUID();

    // Invalidate prior unused OTPs for this user
    await db.query(
      `UPDATE otp_codes 
            SET used = 1 
            WHERE user_id = $1 AND purpose = 'password_reset' AND used = 0`,
      [user.id]
    );

    // Save new OTP record (strictly email channel)
    await db.query(
      `INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at, used) 
            VALUES ($1, $2, 'email', $3, 'password_reset', $4, 0)`,
      [otpId, user.id, codeHash, expiresAt]
    );

    // Dispatch OTP exclusively via Email
    const emailSent = await sendOtpEmail(emailStr, otp, {
      purpose: "password_reset",
      recipientName: user.name as string,
    });

    const destinationDisplay = maskIdentifier(emailStr);

    return NextResponse.json({
      success: true,
      message: `Verification code dispatched to your registered email (${destinationDisplay})`,
      channel: "email",
      user_id: user.id,
      login_id: user.login_id,
      name: user.name,
      role: user.role,
      masked_destination: destinationDisplay,
      masked_email: destinationDisplay,
    });
  } catch (error) {
    console.error("Forgot password send-otp error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
