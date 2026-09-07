import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.query(
      `SELECT req.*, u.role 
            FROM profile_change_requests req
            JOIN users u ON req.user_id = u.id
            WHERE u.role = 'manager' AND req.status = 'pending'
            ORDER BY req.requested_at ASC`,
      []
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Error fetching manager profile requests:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  // EXPLICIT SECURITY CHECK: Must be an Admin
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only admins can approve manager requests" }, { status: 403 });
  }

  const adminId = session.user.id;
  
  try {
    const body = await request.json();
    const { id, status, reviewer_note } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: "Invalid status or missing ID" }, { status: 400 });
    }

    if (status === 'rejected' && !reviewer_note) {
      return NextResponse.json({ error: "Note is required for rejection" }, { status: 400 });
    }

    const checkResult = await db.query(
      `SELECT req.requested_value, req.field_type, req.user_id, u.role
            FROM profile_change_requests req
            JOIN users u ON req.user_id = u.id
            WHERE req.id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const targetUser = checkResult.rows[0];

    // Ensure it's a manager request
    if (targetUser.role !== 'manager') {
      return NextResponse.json({ error: "Forbidden: Request does not belong to a manager" }, { status: 403 });
    }

    if (status === 'approved') {
      // Uniqueness check for login_id
      if (targetUser.field_type === 'login_id') {
        const uniqueCheck = await db.query(
          "SELECT id FROM users WHERE login_id = $1",
          [targetUser.requested_value]
        );

        if (uniqueCheck.rows.length > 0) {
          // Auto-reject
          await db.query(
            `UPDATE profile_change_requests 
                  SET status = 'rejected', reviewer_note = 'ID no longer available', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
                  WHERE id = $2`,
            [adminId, id]
          );
          return NextResponse.json({ success: true, auto_rejected: true, message: "ID was taken; request auto-rejected." });
        }
      }

      await db.query(
        `UPDATE users SET ${targetUser.field_type} = $1 WHERE id = $2`,
        [targetUser.requested_value, targetUser.user_id]
      );
      
      await db.query(
        `UPDATE profile_change_requests 
              SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
        [adminId, id]
      );
      
    } else {
      // Rejection
      await db.query(
        `UPDATE profile_change_requests 
              SET status = 'rejected', reviewer_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
              WHERE id = $3`,
        [reviewer_note, adminId, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
