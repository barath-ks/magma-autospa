import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;
  const staffId = (session.user as any).id;

  try {
    const { customer_id, offer_id } = await request.json();

    if (!customer_id || !offer_id) {
      return NextResponse.json({ error: "Missing customer_id or offer_id" }, { status: 400 });
    }

    // 1. Verify customer belongs to this branch
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

    // 4. Process Redemption in a transaction sequence
    const redemptionId = uuidv4();
    const newBalance = currentPoints - requiredPoints;

    await db.batch([
      {
        sql: `UPDATE customers SET points_balance = ? WHERE id = ?`,
        args: [newBalance, customer_id],
      },
      {
        sql: `INSERT INTO redemptions (id, customer_id, branch_id, staff_id, offer_id, points_redeemed)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [redemptionId, customer_id, staffBranchId, staffId, offer_id, requiredPoints],
      }
    ], "write");

    return NextResponse.json({ 
      success: true, 
      new_balance: newBalance,
      message: "Redemption successful" 
    });

  } catch (error) {
    console.error("Error processing redemption:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
