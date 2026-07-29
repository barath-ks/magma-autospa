import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await db.execute(`
      SELECT o.*, b.name as branch_name 
      FROM offers o 
      JOIN branches b ON o.branch_id = b.id 
      ORDER BY o.created_at DESC
    `);
    return NextResponse.json({ offers: result.rows });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, points_required, branch_id } = body;

    if (!name || points_required === undefined || !branch_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (Number(points_required) <= 0) {
      return NextResponse.json({ error: "Points required must be greater than 0" }, { status: 400 });
    }

    const branchCheck = await db.execute({
      sql: "SELECT id FROM branches WHERE id = ?",
      args: [branch_id]
    });

    if (branchCheck.rows.length === 0) {
      return NextResponse.json({ error: "Invalid branch_id" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO offers (id, name, description, points_required, branch_id, is_active)
            VALUES (?, ?, ?, ?, ?, 1)`,
      args: [id, name, description || '', Number(points_required), branch_id],
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
