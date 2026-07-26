import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffId = session.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Get upcoming approved shifts
    const upcomingResult = await db.execute({
      sql: `SELECT * FROM shift_requests 
            WHERE staff_id = ? AND status = 'approved' AND requested_date >= ?
            ORDER BY requested_date ASC, start_time ASC`,
      args: [staffId, today],
    });

    // 2. Get pending and recently rejected requests
    const pendingResult = await db.execute({
      sql: `SELECT * FROM shift_requests 
            WHERE staff_id = ? AND status IN ('pending', 'rejected')
            ORDER BY created_at DESC LIMIT 50`,
      args: [staffId],
    });

    return NextResponse.json({
      upcoming: upcomingResult.rows,
      requests: pendingResult.rows
    });
  } catch (error) {
    console.error("Error fetching staff schedule:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffId = session.user.id;
  const branchId = (session.user as any).branch_id;
  
  try {
    const body = await request.json();
    const { requested_date, start_time, end_time, staff_note } = body;

    if (!requested_date || !start_time || !end_time) {
      return NextResponse.json({ error: "Date and times are required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO shift_requests (id, staff_id, branch_id, requested_date, start_time, end_time, staff_note)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, staffId, branchId, requested_date, start_time, end_time, staff_note || null],
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating shift request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
