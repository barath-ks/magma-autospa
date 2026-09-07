import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { getBranchVariants, resolveCanonicalBranchId } from "@/lib/branch-utils";

const rewardSchema = z.object({
  name: z.string().min(2, "Reward name must be at least 2 characters"),
  description: z.string().optional().default(""),
  points_required: z.coerce.number().min(1, "Points required must be at least 1"),
  branch_id: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rewards = await db.query(`
      SELECT 
        o.id,
        o.name,
        o.description,
        o.points_required,
        o.discount_type,
        o.discount_value,
        o.branch_id,
        o.is_active,
        o.created_at,
        COALESCE(b.name, o.branch_id) as branch_name 
      FROM offers o 
      LEFT JOIN branches b ON (
        o.branch_id = b.id 
        OR o.branch_id = b.name 
        OR o.branch_id = b.code 
        OR o.branch_id = b.branch_code
      )
      WHERE o.discount_type = 'reward'
      ORDER BY o.created_at DESC
    `);
    
    return NextResponse.json({ rewards: rewards.rows });
  } catch (error: any) {
    console.error("[GET /api/admin/rewards] Database error:", error);
    return NextResponse.json({ error: error?.message || "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = rewardSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { name, description, points_required, branch_id, is_active } = result.data;
    const rawBranchId = branch_id && branch_id.trim() !== "" ? branch_id.trim() : null;
    const finalBranchId = rawBranchId ? await resolveCanonicalBranchId(rawBranchId) : null;

    // Check duplicate within the same scope across all branch variants
    let existing;
    if (finalBranchId) {
      const variants = await getBranchVariants(finalBranchId);
      const placeholders = variants.map((_, idx) => `$${idx + 2}`).join(", ");
      existing = await db.query(
        `SELECT id FROM offers WHERE name = $1 AND discount_type = 'reward' AND branch_id IN (${placeholders})`,
        [name, ...variants]
      );
    } else {
      existing = await db.query(
        "SELECT id FROM offers WHERE name = $1 AND discount_type = 'reward' AND (branch_id IS NULL OR branch_id = '')",
        [name]
      );
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ 
        error: "A loyalty reward with this name already exists in this branch scope" 
      }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO offers 
            (id, name, description, discount_type, discount_value, points_required, min_spend, start_date, end_date, branch_id, is_active) 
            VALUES ($1, $2, $3, 'reward', 0, $4, 0, NULL, NULL, $5, $6)`,
      [
        id, 
        name, 
        description || "", 
        points_required, 
        finalBranchId, 
        is_active ? 1 : 0
      ]
    );

    return NextResponse.json({ 
      success: true, 
      reward: { id, name, description, points_required, branch_id: finalBranchId, is_active } 
    });
  } catch (error: any) {
    console.error("[POST /api/admin/rewards] Database error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create reward" }, { status: 500 });
  }
}
