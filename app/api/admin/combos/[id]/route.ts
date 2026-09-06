import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateComboSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  bundle_price: z.number().min(0).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
  service_ids: z.array(z.string()).min(2, "A combo must include at least two services").optional(),
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
      sql: `SELECT c.*, b.name as branch_name FROM combos c LEFT JOIN branches b ON c.branch_id = b.id WHERE c.id = ?`,
      args: [id]
    });
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }
    
    const comboServices = await db.execute({
      sql: `SELECT s.id as service_id, s.name as service_name
            FROM combo_services cs
            JOIN services s ON cs.service_id = s.id
            WHERE cs.combo_id = ?`,
      args: [id]
    });

    return NextResponse.json({ combo: { ...res.rows[0], services: comboServices.rows } });
  } catch (error) {
    console.error("Error fetching combo:", error);
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
    const result = updateComboSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { 
      name, description, bundle_price, start_date, end_date, branch_id, is_active, service_ids 
    } = result.data;

    const currentRes = await db.execute({ sql: "SELECT name, branch_id FROM combos WHERE id = ?", args: [id] });
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const finalName = name !== undefined ? name : current.name;
    const finalBranchId = branch_id !== undefined ? (branch_id || null) : current.branch_id;

    if (name !== undefined || branch_id !== undefined) {
      let existing;
      if (finalBranchId) {
        existing = await db.execute({
          sql: "SELECT id FROM combos WHERE name = ? AND branch_id = ? AND id != ?",
          args: [finalName, finalBranchId, id]
        });
      } else {
        existing = await db.execute({
          sql: "SELECT id FROM combos WHERE name = ? AND branch_id IS NULL AND id != ?",
          args: [finalName, id]
        });
      }

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "A combo with this name already exists in this scope" }, { status: 400 });
      }
    }

    const updates = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); args.push(name); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (bundle_price !== undefined) { updates.push("bundle_price = ?"); args.push(bundle_price); }
    if (start_date !== undefined) { updates.push("start_date = ?"); args.push(start_date || null); }
    if (end_date !== undefined) { updates.push("end_date = ?"); args.push(end_date || null); }
    if (branch_id !== undefined) { updates.push("branch_id = ?"); args.push(finalBranchId); }
    if (is_active !== undefined) { updates.push("is_active = ?"); args.push(is_active ? 1 : 0); }

    const txn = await db.transaction("write");

    try {
      if (updates.length > 0) {
        args.push(id);
        await txn.execute({
          sql: `UPDATE combos SET ${updates.join(", ")} WHERE id = ?`,
          args,
        });
      }
      
      if (service_ids) {
        await txn.execute({ sql: "DELETE FROM combo_services WHERE combo_id = ?", args: [id] });
        for (const svcId of service_ids) {
          await txn.execute({
            sql: "INSERT INTO combo_services (combo_id, service_id) VALUES (?, ?)",
            args: [id, svcId]
          });
        }
      }

      await txn.commit();
      return NextResponse.json({ success: true });
    } catch (txnErr) {
      await txn.rollback();
      throw txnErr;
    }
  } catch (error) {
    console.error("Error updating combo:", error);
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
      sql: "UPDATE combos SET is_active = 0 WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting combo:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
