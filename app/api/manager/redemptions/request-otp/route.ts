import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager" && (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;

  try {
    const { customer_id, offer_id } = await request.json();

    if (!customer_id || !offer_id) {
      return NextResponse.json({ error: "Missing customer_id or offer_id" }, { status: 400 });
    }

    // 1. Verify customer belongs to this branch
    const customerRes = await db.execute({
      sql: `SELECT points_balance, branch_id, email FROM customers WHERE id = ?`,
      args: [customer_id],
    });

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerRes.rows[0];
    if (customer.branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Unauthorized: Customer belongs to a different branch" }, { status: 403 });
    }

    // TODO: Temporary limitation. SMS/WhatsApp OTP delivery is planned as a future alternative channel
    // once the business completes DLT registration. Once implemented, check for phone if email is absent.
    if (!customer.email || customer.email.trim() === "") {
      return NextResponse.json({ 
        error: "This customer has no email on file — redemption verification requires an email or phone number. Please add an email to their profile, or ask them to provide one, to proceed." 
      }, { status: 400 });
    }

    // 2. Verify offer belongs to this branch and is active
    const offerRes = await db.execute({
      sql: `SELECT points_required, branch_id, is_active FROM offers WHERE id = ?`,
      args: [offer_id],
    });

    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const offer = offerRes.rows[0];
    if (offer.branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Unauthorized: Offer belongs to a different branch" }, { status: 403 });
    }
    if (!offer.is_active) {
      return NextResponse.json({ error: "Offer is no longer active" }, { status: 400 });
    }

    // 3. Check points balance
    const currentPoints = Number(customer.points_balance);
    const requiredPoints = Number(offer.points_required);

    if (currentPoints < requiredPoints) {
      return NextResponse.json({ error: "Insufficient points balance" }, { status: 400 });
    }

    // 4. Generate OTP and store it
    const otp = generateOTP();
    const hash = await bcrypt.hash(otp, 10);
    const otpId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await db.execute({
      sql: `INSERT INTO customer_otp_codes (id, customer_id, channel, code_hash, purpose, expires_at)
            VALUES (?, ?, 'email', ?, 'redemption', ?)`,
      args: [otpId, customer_id, hash, expiresAt],
    });

    // 5. Send OTP via email
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
        },
      });

      const messageText = `Your Magma Autospa redemption verification code is: ${otp}. Share this code with the staff member assisting you to complete your reward redemption. This code expires in 10 minutes.`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: customer.email as string,
        subject: "Magma Autospa - Redemption Verification Code",
        text: messageText,
      });
      console.log(`[SMTP LIVE TEST] Sent OTP ${otp} to ${customer.email}`);
    } else {
      console.log(`[SMTP MOCK] Sent OTP ${otp} to ${customer.email}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent successfully" 
    });

  } catch (error) {
    console.error("Error processing OTP request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
