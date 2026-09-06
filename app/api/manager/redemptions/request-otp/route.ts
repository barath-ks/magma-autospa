import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/email";
import { isBranchMatch } from "@/lib/branch-utils";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0] || ""}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "branch" && role !== "manager" && role !== "admin" && role !== "staff") {
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
      sql: `SELECT points_balance, branch_id, email, name FROM customers WHERE id = ?`,
      args: [customer_id],
    });

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerRes.rows[0];
    if (role !== "admin") {
      const customerMatch = await isBranchMatch(customer.branch_id as string, staffBranchId);
      if (!customerMatch) {
        return NextResponse.json({ error: "Unauthorized: Customer belongs to a different branch" }, { status: 403 });
      }
    }

    // Ensure customer has a registered email address for verification
    if (!customer.email || typeof customer.email !== "string" || !customer.email.trim()) {
      return NextResponse.json({ 
        error: "This customer has no registered email on file. An email address is required to receive the redemption verification code. Please update their profile to add an email." 
      }, { status: 400 });
    }

    const cleanEmail = customer.email.trim();

    // 2. Verify offer belongs to this branch and is active
    const offerRes = await db.execute({
      sql: `SELECT name, points_required, branch_id, is_active FROM offers WHERE id = ?`,
      args: [offer_id],
    });

    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const offer = offerRes.rows[0];
    if (role !== "admin" && offer.branch_id) {
      const offerMatch = await isBranchMatch(offer.branch_id as string, staffBranchId);
      if (!offerMatch) {
        return NextResponse.json({ error: "Unauthorized: Offer belongs to a different branch" }, { status: 403 });
      }
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

    // Invalidate existing unused redemption OTPs for this customer
    await db.execute({
      sql: `UPDATE customer_otp_codes SET used = 1 WHERE customer_id = ? AND purpose = 'redemption' AND used = 0`,
      args: [customer_id],
    });

    await db.execute({
      sql: `INSERT INTO customer_otp_codes (id, customer_id, channel, code_hash, purpose, expires_at, used)
            VALUES (?, ?, 'email', ?, 'redemption', ?, 0)`,
      args: [otpId, customer_id, hash, expiresAt],
    });

    // 5. Send OTP exclusively via Email using unified helper
    const emailSent = await sendOtpEmail(cleanEmail, otp, {
      purpose: "loyalty_claim",
      recipientName: customer.name as string,
      offerName: offer.name as string,
      pointsRequired: requiredPoints,
    });

    const masked = maskEmail(cleanEmail);

    return NextResponse.json({ 
      success: true, 
      message: `Verification code sent to customer's registered email (${masked})`,
      email: cleanEmail,
      masked_email: masked,
    });

  } catch (error) {
    console.error("Error processing OTP request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
