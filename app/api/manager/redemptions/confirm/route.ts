import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager" && (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;
  const staffId = (session.user as any).id;

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
      sql: `SELECT points_balance, branch_id FROM customers WHERE id = ?`,
      args: [customer_id],
    });

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerRes.rows[0];
    if (customer.branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Unauthorized: Customer belongs to a different branch" }, { status: 403 });
    }

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

    const currentPoints = Number(customer.points_balance);
    const requiredPoints = Number(offer.points_required);

    if (currentPoints < requiredPoints) {
      return NextResponse.json({ error: "Insufficient points balance" }, { status: 400 });
    }

    // 3. Process Redemption in a transaction sequence
    const redemptionId = uuidv4();
    const newBalance = currentPoints - requiredPoints;

    await db.batch([
      // Mark OTP as used
      {
        sql: `UPDATE customer_otp_codes SET used = 1 WHERE id = ?`,
        args: [latestOtp.id],
      },
      // Deduct Points
      {
        sql: `UPDATE customers SET points_balance = ? WHERE id = ?`,
        args: [newBalance, customer_id],
      },
      // Record Redemption
      {
        sql: `INSERT INTO redemptions (id, customer_id, branch_id, staff_id, offer_id, points_redeemed)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [redemptionId, customer_id, staffBranchId, staffId, offer_id, requiredPoints],
      },
      // Ledger Entry
      {
        sql: `INSERT INTO loyalty_points_ledger (id, customer_id, type, points)
              VALUES (?, ?, 'redeemed', ?)`,
        args: [uuidv4(), customer_id, requiredPoints],
      }
    ], "write");

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
