import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can view branches" }, { status: 403 });
  }

  try {
    const result = await db.execute("SELECT id, name, location, created_at FROM branches ORDER BY name ASC");
    return NextResponse.json({ branches: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can create branches" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, location, manager_name, manager_phone, manager_email } = body;

    if (!name || !location || !manager_name) {
      return NextResponse.json({ error: "Branch name, location, and manager name are required" }, { status: 400 });
    }

    // App-level check for duplicate branch name to return a clean error
    const duplicateCheck = await db.execute({ sql: "SELECT id FROM branches WHERE name = ?", args: [name] });
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: "A branch with this name already exists" }, { status: 400 });
    }

    // Generate branch ID
    const branchId = uuidv4();

    // Generate Manager Login ID
    const prefix = 'MGR-';
    const idResult = await db.execute({
      sql: `SELECT login_id FROM users WHERE role = 'manager' AND login_id LIKE ? ORDER BY login_id DESC LIMIT 1`,
      args: [`${prefix}%`]
    });

    let nextNum = 1;
    if (idResult.rows.length > 0) {
      const lastId = idResult.rows[0].login_id as string;
      const numericPart = parseInt(lastId.replace(prefix, ''), 10);
      if (!isNaN(numericPart)) {
        nextNum = numericPart + 1;
      }
    }
    const newLoginId = `${prefix}${nextNum.toString().padStart(4, '0')}`;

    // Generate Manager Temporary Password (NEVER logged or persisted in plaintext!)
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
    const userId = crypto.randomUUID();

    // Perform inserts in a single batch (pseudo-transaction for Turso/SQLite)
    await db.batch([
      {
        sql: "INSERT INTO branches (id, name, location, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        args: [branchId, name, location]
      },
      {
        sql: `INSERT INTO users (id, login_id, password_hash, role, name, email, phone, branch_id, must_change_password)
              VALUES (?, ?, ?, 'manager', ?, ?, ?, ?, 1)`,
        args: [userId, newLoginId, tempPasswordHash, manager_name, manager_email || null, manager_phone || null, branchId]
      }
    ]);

    // Return the newly created branch info and the manager credentials
    return NextResponse.json({
      success: true,
      branch: { id: branchId, name, location },
      manager: {
        login_id: newLoginId,
        temp_password: tempPassword, // Sent strictly over HTTPS, never logged server-side
        name: manager_name
      }
    });

  } catch (error: any) {
    console.error("Error creating branch:", error);
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A unique constraint failed (likely branch name or login ID)" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
