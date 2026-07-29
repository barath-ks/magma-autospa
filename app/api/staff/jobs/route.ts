import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;

  try {
    const result = await db.execute({
      sql: `SELECT 
              t.id, 
              t.status, 
              t.created_at,
              t.claimed_at,
              t.finished_at,
              c.vehicle_model,
              c.vehicle_number,
              c.name as customer_name,
              u.name as assigned_staff_name,
              u.id as assigned_staff_id,
              (SELECT s.name 
               FROM transaction_services ts 
               JOIN services s ON ts.service_id = s.id 
               WHERE ts.transaction_id = t.id 
               LIMIT 1) as service_name
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.staff_id = u.id
            WHERE t.branch_id = ? AND t.status != 'finished'
            ORDER BY t.created_at ASC`,
      args: [branchId],
    });

    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userBranchId = (session.user as any).branch_id;
  const userRole = (session.user as any).role;

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    // 1. Fetch transaction to verify branch and current assignment
    const result = await db.execute({
      sql: `SELECT branch_id, staff_id, status FROM transactions WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const transaction = result.rows[0];

    // Security Check 1: Branch verification
    if (transaction.branch_id !== userBranchId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    // Security Check 3: Ownership strict enforcement
    const isUnclaimed = transaction.staff_id === null;
    const isOwner = transaction.staff_id === userId;
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';

    if (!isUnclaimed && !isOwner && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Job is claimed by another staff member" }, { status: 403 });
    }

    // Determine staff_id to set. Implicit claim on first touch.
    const newStaffId = isUnclaimed ? userId : transaction.staff_id;
    const isClaimingNow = isUnclaimed && newStaffId === userId;
    const isFinishingNow = status === 'finished' && transaction.status !== 'finished';

    // Execute update
    let sql = `UPDATE transactions SET status = ?, staff_id = ?`;
    const args: any[] = [status, newStaffId];

    if (isClaimingNow) {
      sql += `, claimed_at = CURRENT_TIMESTAMP`;
    }
    if (isFinishingNow) {
      sql += `, finished_at = CURRENT_TIMESTAMP`;
    }

    sql += ` WHERE id = ?`;
    args.push(id);

    await db.execute({ sql, args });

    return NextResponse.json({ success: true, staff_id: newStaffId });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
