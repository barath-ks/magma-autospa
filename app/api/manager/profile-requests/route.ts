import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managerBranchId = (session.user as any).branch_id;

  try {
    const result = await db.execute({
      sql: `SELECT req.*, u.role, u.branch_id 
            FROM profile_change_requests req
            JOIN users u ON req.user_id = u.id
            WHERE u.role = 'staff' AND u.branch_id = ? AND req.status = 'pending'
            ORDER BY req.requested_at ASC`,
      args: [managerBranchId],
    });

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Error fetching staff profile requests:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managerId = session.user.id;
  const managerBranchId = (session.user as any).branch_id;
  
  try {
    const body = await request.json();
    const { id, status, reviewer_note } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: "Invalid status or missing ID" }, { status: 400 });
    }

    if (status === 'rejected' && !reviewer_note) {
      return NextResponse.json({ error: "Note is required for rejection" }, { status: 400 });
    }

    // EXPLICIT SECURITY CHECK: Verify the request belongs to a user in the manager's branch
    const checkResult = await db.execute({
      sql: `SELECT req.requested_value, req.field_type, req.user_id, u.branch_id, u.role
            FROM profile_change_requests req
            JOIN users u ON req.user_id = u.id
            WHERE req.id = ?`,
      args: [id]
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const targetUser = checkResult.rows[0];

    // Reject if target user is not staff or belongs to another branch
    if (targetUser.role !== 'staff' || targetUser.branch_id !== managerBranchId) {
      return NextResponse.json({ error: "Forbidden: Request belongs to a different branch or role" }, { status: 403 });
    }

    if (status === 'approved') {
      // Uniqueness check for login_id
      if (targetUser.field_type === 'login_id') {
        const uniqueCheck = await db.execute({
          sql: "SELECT id FROM users WHERE login_id = ?",
          args: [targetUser.requested_value]
        });

        if (uniqueCheck.rows.length > 0) {
          // Auto-reject because ID is taken
          await db.execute({
            sql: `UPDATE profile_change_requests 
                  SET status = 'rejected', reviewer_note = 'ID no longer available', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [managerId, id],
          });
          return NextResponse.json({ success: true, auto_rejected: true, message: "ID was taken; request auto-rejected." });
        }
      }

      // Proceed with approval and update the user's field
      await db.execute({
        sql: `UPDATE users SET ${targetUser.field_type} = ? WHERE id = ?`,
        args: [targetUser.requested_value, targetUser.user_id],
      });
      
      await db.execute({
        sql: `UPDATE profile_change_requests 
              SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [managerId, id],
      });
      
    } else {
      // Rejection
      await db.execute({
        sql: `UPDATE profile_change_requests 
              SET status = 'rejected', reviewer_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [reviewer_note, managerId, id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
