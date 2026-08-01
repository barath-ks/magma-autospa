import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { name, description, points_required, branch_id, is_active } = body;

    if (points_required !== undefined && Number(points_required) <= 0) {
      return NextResponse.json({ error: "Points required must be greater than 0" }, { status: 400 });
    }

    if (branch_id !== undefined) {
      const branchCheck = await db.execute({
        sql: "SELECT id FROM branches WHERE id = ?",
        args: [branch_id]
      });

      if (branchCheck.rows.length === 0) {
        return NextResponse.json({ error: "Invalid branch_id" }, { status: 400 });
      }
    }

    // Build dynamic update
    const updates = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); args.push(name); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (points_required !== undefined) { updates.push("points_required = ?"); args.push(Number(points_required)); }
    if (branch_id !== undefined) { updates.push("branch_id = ?"); args.push(branch_id); }
    if (is_active !== undefined) { updates.push("is_active = ?"); args.push(is_active ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE offers SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating offer:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    // Soft delete
    await db.execute({
      sql: `UPDATE offers SET is_active = 0 WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
