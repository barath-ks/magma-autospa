import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { login_id } = await req.json();
    if (!login_id) {
      return NextResponse.json({ error: "Login ID is required" }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT id, role, phone, email FROM users WHERE login_id = ?",
      args: [login_id],
    });

    if (userRes.rows.length === 0) {
      // Prevent enumeration while failing safe
      return NextResponse.json({ message: "If that ID is registered, an OTP was sent." });
    }

    const user = userRes.rows[0];

    if (!user.phone) {
      return NextResponse.json(
        { error: "No phone on file — contact your admin to reset your password" },
        { status: 400 }
      );
    }

    if (!process.env.WHATSAPP_API_KEY) {
      return NextResponse.json(
        { error: "WhatsApp API key not configured. Cannot deliver OTP." },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Generate Phone OTP
    const phoneOtp = generateOTP();
    const phoneHash = await bcrypt.hash(phoneOtp, 10);
    const phoneOtpId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at) VALUES (?, ?, 'phone', ?, 'password_reset', ?)`,
      args: [phoneOtpId, user.id, phoneHash, expiresAt],
    });

    // Mock sending WhatsApp Message
    console.log(`[WHATSAPP MOCK] Sent OTP ${phoneOtp} to ${user.phone}`);

    // If Admin, generate Email OTP
    if (user.role === 'admin') {
      if (!user.email) {
        return NextResponse.json(
          { error: "Admin accounts must have an email configured for Two-Factor reset." },
          { status: 400 }
        );
      }

      const emailOtp = generateOTP();
      const emailHash = await bcrypt.hash(emailOtp, 10);
      const emailOtpId = crypto.randomUUID();

      await db.execute({
        sql: `INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at) VALUES (?, ?, 'email', ?, 'password_reset', ?)`,
        args: [emailOtpId, user.id, emailHash, expiresAt],
      });

      // Send Email
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "noreply@magmaautospa.com",
          to: user.email as string,
          subject: "Magma Autospa - Admin Password Reset OTP",
          text: `Your Admin Verification Code is: ${emailOtp}`,
        });
      } else {
        console.log(`[SMTP MOCK] Sent Admin Email OTP ${emailOtp} to ${user.email}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      role: user.role,
      message: "OTP sent successfully."
    });
  } catch (error) {
    console.error("OTP Request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
