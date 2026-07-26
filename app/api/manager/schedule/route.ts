import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Get pending requests for this branch, with staff info
    const pendingResult = await db.execute({
      sql: `SELECT sr.*, u.login_id as staff_name 
            FROM shift_requests sr
            JOIN users u ON sr.staff_id = u.id
            WHERE sr.branch_id = ? AND sr.status = 'pending'
            ORDER BY sr.created_at ASC`,
      args: [branchId],
    });

    // 2. Get approved upcoming schedule for this branch
    const scheduleResult = await db.execute({
      sql: `SELECT sr.*, u.login_id as staff_name 
            FROM shift_requests sr
            JOIN users u ON sr.staff_id = u.id
            WHERE sr.branch_id = ? AND sr.status = 'approved' AND sr.requested_date >= ?
            ORDER BY sr.requested_date ASC, sr.start_time ASC`,
      args: [branchId, today],
    });

    return NextResponse.json({
      pending: pendingResult.rows,
      schedule: scheduleResult.rows
    });
  } catch (error) {
    console.error("Error fetching manager schedule:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managerBranchId = (session.user as any).branch_id;
  
  try {
    const body = await request.json();
    const { id, status, manager_note } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: "Invalid status or missing ID" }, { status: 400 });
    }

    if (status === 'rejected' && !manager_note) {
      return NextResponse.json({ error: "Manager note is required for rejection" }, { status: 400 });
    }

    // Explicit security check: ensure target request belongs to manager's branch
    const checkResult = await db.execute({
      sql: "SELECT branch_id FROM shift_requests WHERE id = ?",
      args: [id]
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (checkResult.rows[0].branch_id !== managerBranchId) {
      return NextResponse.json({ error: "Forbidden: Request belongs to a different branch" }, { status: 403 });
    }

    // Update the request
    await db.execute({
      sql: `UPDATE shift_requests 
            SET status = ?, manager_note = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [status, manager_note || null, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating shift request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
