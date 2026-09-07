import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getBranchVariants, resolveCanonicalBranchId } from "@/lib/branch-utils";

const updateRewardSchema = z.object({
  name: z.string().min(2, "Reward name must be at least 2 characters").optional(),
  description: z.string().optional(),
  points_required: z.coerce.number().min(1, "Points required must be at least 1").optional(),
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
    const res = await db.query(
      `SELECT o.*, COALESCE(b.name, o.branch_id) as branch_name 
            FROM offers o 
            LEFT JOIN branches b ON (
              o.branch_id = b.id 
              OR o.branch_id = b.name 
              OR o.branch_id = b.code 
              OR o.branch_id = b.branch_code
            )
            WHERE o.id = $1 AND o.discount_type = 'reward'`,
      [id]
    );
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Loyalty reward not found" }, { status: 404 });
    }

    return NextResponse.json({ reward: res.rows[0] });
  } catch (error: any) {
    console.error("[GET /api/admin/rewards/[id]] Database error:", error);
    return NextResponse.json({ error: error?.message || "Database error" }, { status: 500 });
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
    const result = updateRewardSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { name, description, points_required, branch_id, is_active } = result.data;

    const currentRes = await db.query(
      "SELECT name, branch_id FROM offers WHERE id = $1 AND discount_type = 'reward'", 
      [id] 
    );
    
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Loyalty reward not found" }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const finalName = name !== undefined ? name : current.name;
    const rawBranchId = branch_id !== undefined 
      ? (branch_id && branch_id.trim() !== "" ? branch_id.trim() : null) 
      : current.branch_id;
    const finalBranchId = rawBranchId ? await resolveCanonicalBranchId(rawBranchId) : null;

    if (name !== undefined || branch_id !== undefined) {
      let existing;
      if (finalBranchId) {
        const variants = await getBranchVariants(finalBranchId);
        const placeholders = variants.map((_, idx) => `$${idx + 2}`).join(", ");
        existing = await db.query(
          `SELECT id FROM offers WHERE name = $1 AND discount_type = 'reward' AND branch_id IN (${placeholders}) AND id != $${variants.length + 2}`,
          [finalName, ...variants, id]
        );
      } else {
        existing = await db.query(
          "SELECT id FROM offers WHERE name = $1 AND discount_type = 'reward' AND (branch_id IS NULL OR branch_id = '') AND id != $2",
          [finalName, id]
        );
      }

      if (existing.rows.length > 0) {
        return NextResponse.json({ 
          error: "A loyalty reward with this name already exists in this branch scope" 
        }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const args: any[] = [];
    let pIdx = 1;

    if (name !== undefined) { updates.push(`name = $${pIdx++}`); args.push(name); }
    if (description !== undefined) { updates.push(`description = $${pIdx++}`); args.push(description); }
    if (points_required !== undefined) { updates.push(`points_required = $${pIdx++}`); args.push(points_required); }
    if (branch_id !== undefined) { updates.push(`branch_id = $${pIdx++}`); args.push(finalBranchId); }
    if (is_active !== undefined) { updates.push(`is_active = $${pIdx++}`); args.push(is_active ? 1 : 0); }

    if (updates.length > 0) {
      args.push(id);
      await db.query(
        `UPDATE offers SET ${updates.join(", ")} WHERE id = $${pIdx} AND discount_type = 'reward'`,
        args
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/admin/rewards/[id]] Database error:", error);
    return NextResponse.json({ error: error?.message || "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    // Check if the reward exists
    const checkRes = await db.query(
      "SELECT id FROM offers WHERE id = $1 AND discount_type = 'reward'",
      [id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "Loyalty reward not found" }, { status: 404 });
    }

    // Check if redemptions exist for this reward
    const redemptionsCheck = await db.query(
      "SELECT count(*) as count FROM redemptions WHERE offer_id = $1",
      [id]
    );

    const redemptionCount = Number(redemptionsCheck.rows[0]?.count || 0);

    if (redemptionCount > 0) {
      // Soft-delete to preserve transaction history
      await db.query(
        "UPDATE offers SET is_active = FALSE WHERE id = $1 AND discount_type = 'reward'",
        [id]
      );
      return NextResponse.json({ 
        success: true, 
        message: "Reward deactivated because past redemptions are linked to it." 
      });
    } else {
      // Hard-delete cleanly
      await db.query(
        "DELETE FROM offers WHERE id = $1 AND discount_type = 'reward'",
        [id]
      );
      return NextResponse.json({ 
        success: true, 
        message: "Reward permanently removed." 
      });
    }
  } catch (error: any) {
    console.error("[DELETE /api/admin/rewards/[id]] Database error:", error);
    return NextResponse.json({ error: error?.message || "Database error" }, { status: 500 });
  }
}
