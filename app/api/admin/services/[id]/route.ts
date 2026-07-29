import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { name, description, price, points_earned, is_active } = body;

    if (price !== undefined && Number(price) <= 0) {
      return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
    }

    // Build dynamic update
    const updates = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); args.push(name); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (price !== undefined) { updates.push("price = ?"); args.push(Number(price)); }
    if (points_earned !== undefined) { updates.push("points_earned = ?"); args.push(Number(points_earned)); }
    if (is_active !== undefined) { updates.push("is_active = ?"); args.push(is_active ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = params;

  try {
    // Soft delete
    await db.execute({
      sql: `UPDATE services SET is_active = 0 WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
