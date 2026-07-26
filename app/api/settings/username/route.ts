import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT * FROM username_change_requests WHERE user_id = ? ORDER BY requested_at DESC`,
      args: [session.user.id],
    });

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Error fetching username requests:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = (session.user as any).role;
  const currentLoginId = (session.user as any).login_id;
  
  try {
    const body = await request.json();
    const { requested_login_id } = body;

    if (!requested_login_id || requested_login_id.length < 3) {
      return NextResponse.json({ error: "Valid requested login ID is required" }, { status: 400 });
    }

    if (requested_login_id === currentLoginId) {
      return NextResponse.json({ error: "Requested ID is the same as current ID" }, { status: 400 });
    }

    // If Admin, bypass request queue, verify uniqueness and apply directly
    if (role === 'admin') {
      const checkUnique = await db.execute({
        sql: "SELECT id FROM users WHERE login_id = ?",
        args: [requested_login_id]
      });

      if (checkUnique.rows.length > 0) {
        return NextResponse.json({ error: "ID no longer available" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE users SET login_id = ? WHERE id = ?",
        args: [requested_login_id, userId]
      });

      return NextResponse.json({ success: true, directUpdate: true });
    }

    // For Staff and Manager, create a pending request
    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO username_change_requests (id, user_id, current_login_id, requested_login_id)
            VALUES (?, ?, ?, ?)`,
      args: [id, userId, currentLoginId, requested_login_id],
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "ID no longer available" }, { status: 400 });
    }
    console.error("Error creating username request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
