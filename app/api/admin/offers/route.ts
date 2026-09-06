import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const offerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'flat', 'multiplier', 'reward']).default('reward'),
  discount_value: z.number().min(0).optional().default(0),
  points_required: z.number().min(0).default(0),
  min_spend: z.number().min(0).default(0),
  start_date: z.string().nullable().optional(), // standard string for HTML date
  end_date: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, { message: "End date must be after start date" });

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const offers = await db.execute(`
      SELECT 
        o.*, 
        b.name as branch_name 
      FROM offers o 
      LEFT JOIN branches b ON o.branch_id = b.id 
      ORDER BY o.created_at DESC
    `);
    
    return NextResponse.json({ offers: offers.rows });
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
    const result = offerSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { 
      name, description, discount_type, discount_value, 
      points_required, min_spend, start_date, end_date, branch_id 
    } = result.data;
    
    const finalBranchId = branch_id || null;

    // Check duplicate
    let existing;
    if (finalBranchId) {
      existing = await db.execute({
        sql: "SELECT id FROM offers WHERE name = ? AND branch_id = ?",
        args: [name, finalBranchId]
      });
    } else {
      existing = await db.execute({
        sql: "SELECT id FROM offers WHERE name = ? AND branch_id IS NULL",
        args: [name]
      });
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An offer with this name already exists in this scope" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO offers 
            (id, name, description, discount_type, discount_value, points_required, min_spend, start_date, end_date, branch_id, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        id, name, description || "", discount_type, discount_value || 0, points_required, 
        min_spend, start_date || null, end_date || null, finalBranchId
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
