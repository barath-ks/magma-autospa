import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionRole = (session.user as any).role;
  const sessionBranchId = (session.user as any).branch_id;

  if (sessionRole === 'staff') {
    return NextResponse.json({ error: "Forbidden: Staff cannot create accounts" }, { status: 403 });
  }

  try {
    const body = await request.json();
    let { name, phone, email, role, branch_id } = body;

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
    }

    // Validate email is compulsory and valid format
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Check email uniqueness
    const existingEmail = await db.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [cleanEmail]
    );

    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: "A user with this email address already exists" }, { status: 400 });
    }

    // Role-based restrictions
    if (sessionRole === 'manager') {
      if (role !== 'staff') {
        return NextResponse.json({ error: "Forbidden: Managers can only create staff accounts" }, { status: 403 });
      }
      // Force the branch_id to be the manager's own branch_id, ignoring any payload attempt
      branch_id = sessionBranchId;
      
      // If payload explicitly provided a mismatching branch_id, reject it.
      if (body.branch_id && body.branch_id !== sessionBranchId) {
        return NextResponse.json({ error: "Forbidden: Managers cannot create accounts for other branches" }, { status: 403 });
      }
    } else if (sessionRole === 'admin') {
      if (role !== 'staff' && role !== 'manager') {
        return NextResponse.json({ error: "Admins can only create staff or manager accounts" }, { status: 400 });
      }
      if (!branch_id) {
        return NextResponse.json({ error: "Branch ID is required when Admin creates an account" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate login_id
    const prefix = role === 'staff' ? 'MAG-' : 'MGR-';
    const idResult = await db.query(
      `SELECT login_id FROM users WHERE role = $1 AND login_id LIKE $2 ORDER BY login_id DESC LIMIT 1`,
      [role, `${prefix}%`]
    );

    let nextNum = 1;
    if (idResult.rows.length > 0) {
      const lastId = idResult.rows[0].login_id as string;
      const numericPart = parseInt(lastId.replace(prefix, ''), 10);
      if (!isNaN(numericPart)) {
        nextNum = numericPart + 1;
      }
    }
    const newLoginId = `${prefix}${nextNum.toString().padStart(4, '0')}`;

    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
    const userId = crypto.randomUUID();

    await db.query(
      `INSERT INTO users (id, login_id, password_hash, role, name, email, phone, branch_id, must_change_password)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
      [userId, newLoginId, tempPasswordHash, role, name, cleanEmail, phone || null, branch_id]
    );

    return NextResponse.json({ 
      success: true, 
      login_id: newLoginId, 
      temp_password: tempPassword 
    });

  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
