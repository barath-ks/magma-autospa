import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateOfferSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'flat', 'multiplier', 'reward']).optional(),
  discount_value: z.number().min(0).optional(),
  points_required: z.number().min(0).optional(),
  min_spend: z.number().min(0).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const res = await db.execute({
      sql: `SELECT o.*, b.name as branch_name FROM offers o LEFT JOIN branches b ON o.branch_id = b.id WHERE o.id = ?`,
      args: [id]
    });
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ offer: res.rows[0] });
  } catch (error) {
    console.error("Error fetching offer:", error);
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
    const result = updateOfferSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { 
      name, description, discount_type, discount_value, 
      points_required, min_spend, start_date, end_date, branch_id, is_active 
    } = result.data;

    const currentRes = await db.execute({ sql: "SELECT name, branch_id FROM offers WHERE id = ?", args: [id] });
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const finalName = name !== undefined ? name : current.name;
    const finalBranchId = branch_id !== undefined ? (branch_id || null) : current.branch_id;

    if (name !== undefined || branch_id !== undefined) {
      let existing;
      if (finalBranchId) {
        existing = await db.execute({
          sql: "SELECT id FROM offers WHERE name = ? AND branch_id = ? AND id != ?",
          args: [finalName, finalBranchId, id]
        });
      } else {
        existing = await db.execute({
          sql: "SELECT id FROM offers WHERE name = ? AND branch_id IS NULL AND id != ?",
          args: [finalName, id]
        });
      }

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "An offer with this name already exists in this scope" }, { status: 400 });
      }
    }

    const updates = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); args.push(name); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (discount_type !== undefined) { updates.push("discount_type = ?"); args.push(discount_type); }
    if (discount_value !== undefined) { updates.push("discount_value = ?"); args.push(discount_value); }
    if (points_required !== undefined) { updates.push("points_required = ?"); args.push(points_required); }
    if (min_spend !== undefined) { updates.push("min_spend = ?"); args.push(min_spend); }
    if (start_date !== undefined) { updates.push("start_date = ?"); args.push(start_date || null); }
    if (end_date !== undefined) { updates.push("end_date = ?"); args.push(end_date || null); }
    if (branch_id !== undefined) { updates.push("branch_id = ?"); args.push(finalBranchId); }
    if (is_active !== undefined) { updates.push("is_active = ?"); args.push(is_active ? 1 : 0); }

    if (updates.length > 0) {
      args.push(id);
      await db.execute({
        sql: `UPDATE offers SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    }

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
    await db.execute({
      sql: "UPDATE offers SET is_active = 0 WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
