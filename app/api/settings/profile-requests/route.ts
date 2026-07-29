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
      sql: `SELECT * FROM profile_change_requests WHERE user_id = ? ORDER BY requested_at DESC`,
      args: [session.user.id],
    });

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Error fetching profile requests:", error);
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
  
  try {
    const body = await request.json();
    const { field_type, requested_value } = body;

    if (!['login_id', 'name'].includes(field_type)) {
      return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
    }

    if (!requested_value || requested_value.trim().length < 3) {
      return NextResponse.json({ error: "Valid requested value is required" }, { status: 400 });
    }

    const currentValue = field_type === 'login_id' ? (session.user as any).login_id : session.user.name;

    if (requested_value === currentValue) {
      return NextResponse.json({ error: "Requested value is the same as current value" }, { status: 400 });
    }

    // If Admin, bypass request queue, verify uniqueness and apply directly
    if (role === 'admin') {
      if (field_type === 'login_id') {
        const checkUnique = await db.execute({
          sql: "SELECT id FROM users WHERE login_id = ?",
          args: [requested_value]
        });

        if (checkUnique.rows.length > 0) {
          return NextResponse.json({ error: "ID no longer available" }, { status: 400 });
        }
      }

      await db.execute({
        sql: `UPDATE users SET ${field_type} = ? WHERE id = ?`,
        args: [requested_value, userId]
      });

      return NextResponse.json({ success: true, directUpdate: true });
    }

    // For Staff and Manager, create a pending request
    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO profile_change_requests (id, user_id, field_type, current_value, requested_value)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, userId, field_type, currentValue, requested_value],
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "ID no longer available" }, { status: 400 });
    }
    console.error("Error creating profile request:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
