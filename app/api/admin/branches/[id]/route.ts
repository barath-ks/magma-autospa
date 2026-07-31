import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can view branch details" }, { status: 403 });
  }

  try {
    const branchRes = await db.execute({
      sql: "SELECT id, name, location, is_active FROM branches WHERE id = ?",
      args: [id]
    });

    if (branchRes.rows.length === 0) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const branch = branchRes.rows[0];

    const usersRes = await db.execute({
      sql: `SELECT id, login_id, name, role, phone, email, created_at 
            FROM users 
            WHERE branch_id = ? AND role IN ('staff', 'manager') AND is_active = 1
            ORDER BY role, created_at DESC`,
      args: [id]
    });

    return NextResponse.json({ branch, users: usersRes.rows });
  } catch (error) {
    console.error("Error fetching branch details:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can edit branches" }, { status: 403 });
  }
  
  const { id } = await props.params;

  try {
    const body = await request.json();
    const { name, location } = body;

    if (!name || !location) {
      return NextResponse.json({ error: "Branch name and location are required" }, { status: 400 });
    }

    // App-level check for duplicate branch name excluding current branch
    const duplicateCheck = await db.execute({ sql: "SELECT id FROM branches WHERE name = ? AND id != ?", args: [name, id] });
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: "A branch with this name already exists" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE branches SET name = ?, location = ? WHERE id = ?",
      args: [name, location, id]
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error updating branch:", error);
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A branch with this name already exists (DB Enforcement)" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
