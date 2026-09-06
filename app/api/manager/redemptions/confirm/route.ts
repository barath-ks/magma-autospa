import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendSMSRedemption } from "@/lib/sms";
import { sendRedemptionConfirmationEmail } from "@/lib/email";
import { isBranchMatch } from "@/lib/branch-utils";

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
  const staffId = role === "branch" ? null : (session.user as any).id;

  try {
    const { customer_id, offer_id, otp } = await request.json();

    if (!customer_id || !offer_id || !otp) {
      return NextResponse.json({ error: "Missing customer_id, offer_id, or otp" }, { status: 400 });
    }

    // 1. Verify OTP
    const otpRes = await db.execute({
      sql: `SELECT id, code_hash, used, expires_at FROM customer_otp_codes 
            WHERE customer_id = ? AND purpose = 'redemption' 
            ORDER BY created_at DESC LIMIT 1`,
      args: [customer_id],
    });

    if (otpRes.rows.length === 0) {
      return NextResponse.json({ error: "No OTP request found for this customer." }, { status: 400 });
    }

    const latestOtp = otpRes.rows[0];

    if (latestOtp.used) {
      return NextResponse.json({ error: "This OTP has already been used." }, { status: 400 });
    }

    if (new Date(latestOtp.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "This OTP has expired." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(otp.trim(), latestOtp.code_hash as string);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    // 2. Pre-checks (Customer, Offer, Points)
    const customerRes = await db.execute({
      sql: `SELECT points_balance, branch_id, name, phone, email FROM customers WHERE id = ?`,
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

    const currentPoints = Number(customer.points_balance);
    const requiredPoints = Number(offer.points_required);

    if (currentPoints < requiredPoints) {
      return NextResponse.json({ error: "Insufficient points balance" }, { status: 400 });
    }

    // 3. Process Redemption in a transaction sequence
    const redemptionId = crypto.randomUUID();
    const redemptionBranchId = staffBranchId || (customer.branch_id as string);

    const txn = await db.transaction("write");
    let newBalance = 0;

    try {
      // Mark OTP as used (safe against TOCTOU)
      const otpUpdate = await txn.execute({
        sql: `UPDATE customer_otp_codes SET used = 1 WHERE id = ? AND used = 0`,
        args: [latestOtp.id],
      });
      
      if (otpUpdate.rowsAffected === 0) {
        throw new Error("OTP_ALREADY_USED");
      }

      // Decrement Points (Atomic safety check with points_balance >= requiredPoints)
      const pointsUpdate = await txn.execute({
        sql: `UPDATE customers 
              SET points_balance = points_balance - ? 
              WHERE id = ? AND points_balance >= ?
              RETURNING points_balance`,
        args: [requiredPoints, customer_id, requiredPoints],
      });
      
      if (pointsUpdate.rows.length === 0) {
        throw new Error("INSUFFICIENT_POINTS");
      }
      
      newBalance = Number(pointsUpdate.rows[0].points_balance);

      // Record Redemption
      await txn.execute({
        sql: `INSERT INTO redemptions (id, customer_id, branch_id, staff_id, offer_id, points_redeemed)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [redemptionId, customer_id, redemptionBranchId, staffId, offer_id, requiredPoints],
      });

      // Ledger Entry
      await txn.execute({
        sql: `INSERT INTO loyalty_points_ledger (id, customer_id, type, points)
              VALUES (?, ?, 'redeemed', ?)`,
        args: [uuidv4(), customer_id, requiredPoints],
      });

      await txn.commit();
      
      if (customer.email) {
        sendRedemptionConfirmationEmail(
          customer.email as string,
          customer.name as string,
          requiredPoints,
          offer.name as string
        ).catch(err => console.error("[EMAIL ERROR] Background email receipt failed:", err));
      }

      if (customer.phone) {
        sendSMSRedemption(
          customer.phone as string, 
          customer.name as string, 
          requiredPoints, 
          offer.name as string
        ).catch(err => console.error("[SMS ERROR] Background SMS failed:", err));
      }
    } catch (txnError: any) {
      await txn.rollback();
      if (txnError.message === "OTP_ALREADY_USED") {
        return NextResponse.json({ error: "This OTP was already used." }, { status: 400 });
      }
      if (txnError.message === "INSUFFICIENT_POINTS") {
        return NextResponse.json({ error: "Insufficient points balance (or balance changed)." }, { status: 400 });
      }
      throw txnError;
    }

    return NextResponse.json({ 
      success: true, 
      new_balance: newBalance,
      message: "Redemption successful" 
    });

  } catch (error) {
    console.error("Error processing redemption confirmation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
