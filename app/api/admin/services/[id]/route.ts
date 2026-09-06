import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  branch_id: z.string().nullable().optional(), 
  price: z.number().min(0).optional(),
  points_earned: z.number().min(0).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  duration_minutes: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const serviceRes = await db.execute({
      sql: `SELECT s.*, b.name as branch_name FROM services s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.id = ?`,
      args: [id]
    });
    
    if (serviceRes.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ service: serviceRes.rows[0] });
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = updateServiceSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { name, branch_id, price, points_earned, description, category, duration_minutes, is_active } = result.data;

    // We need to fetch the existing service to know its name and branch_id if they aren't provided in the patch,
    // in order to check for duplicate name collisions.
    const currentRes = await db.execute({ sql: "SELECT name, branch_id FROM services WHERE id = ?", args: [id] });
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const finalName = name !== undefined ? name : current.name;
    // branch_id in payload could be `null` to explicitly clear it, or undefined if not changing
    const finalBranchId = branch_id !== undefined ? (branch_id || null) : current.branch_id;

    if (name !== undefined || branch_id !== undefined) {
      let existing;
      if (finalBranchId) {
        existing = await db.execute({
          sql: "SELECT id FROM services WHERE name = ? AND branch_id = ? AND id != ?",
          args: [finalName, finalBranchId, id]
        });
      } else {
        existing = await db.execute({
          sql: "SELECT id FROM services WHERE name = ? AND branch_id IS NULL AND id != ?",
          args: [finalName, id]
        });
      }

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "A service with this name already exists in this scope" }, { status: 400 });
      }
    }

    const updates = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); args.push(name); }
    if (branch_id !== undefined) { updates.push("branch_id = ?"); args.push(finalBranchId); }
    if (price !== undefined) { updates.push("price = ?"); args.push(price); }
    if (points_earned !== undefined) { updates.push("points_earned = ?"); args.push(points_earned); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (category !== undefined) { updates.push("category = ?"); args.push(category); }
    if (duration_minutes !== undefined) { updates.push("duration_minutes = ?"); args.push(duration_minutes); }
    if (is_active !== undefined) { updates.push("is_active = ?"); args.push(is_active ? 1 : 0); }

    if (updates.length > 0) {
      args.push(id);
      await db.execute({
        sql: `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating service:", error);
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
    await db.execute({
      sql: "UPDATE services SET is_active = 0 WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
