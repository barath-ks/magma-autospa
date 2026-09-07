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
    const customerRes = await db.query(
      `SELECT points_balance, branch_id, email, name FROM customers WHERE id = $1`,
      [customer_id]
    );

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerRes.rows[0];
    const pointsBalance = Number(customer.points_balance || 0);

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

    // 2. Fetch offer details
    const offerRes = await db.query(
      "SELECT points_required, name, branch_id FROM offers WHERE id = $1 AND is_active = TRUE",
      [offer_id]
    );

    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: "Offer not found or inactive" }, { status: 404 });
    }

    const offer = offerRes.rows[0];
    const requiredPoints = Number(offer.points_required || 0);

    if (role !== "admin" && offer.branch_id) {
      const offerMatch = await isBranchMatch(offer.branch_id as string, staffBranchId);
      if (!offerMatch) {
        return NextResponse.json({ error: "Unauthorized: Offer belongs to a different branch" }, { status: 403 });
      }
    }

    if (pointsBalance < requiredPoints) {
      return NextResponse.json({ 
        error: `Customer has insufficient points balance. Current: ${pointsBalance}, Required: ${requiredPoints}` 
      }, { status: 400 });
    }

    // 3. Generate OTP and store in DB
    const otp = generateOTP();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const otpId = crypto.randomUUID();

    // Invalidate existing unused redemption OTPs for this customer
    await db.query(
      `UPDATE customer_otp_codes 
            SET used = 1 
            WHERE customer_id = $1 AND purpose = 'redemption' AND used = 0`,
      [customer_id]
    );

    // Store new OTP
    await db.query(
      `INSERT INTO customer_otp_codes (id, customer_id, channel, code_hash, purpose, expires_at, used) 
            VALUES ($1, $2, 'email', $3, 'redemption', $4, 0)`,
      [otpId, customer_id, codeHash, expiresAt]
    );

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
