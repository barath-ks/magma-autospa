import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const createServiceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  branch_id: z.string().nullable().optional(), // Nullable for global services
  price: z.number().min(0, "Price cannot be negative"),
  points_earned: z.number().min(0).default(10),
  description: z.string().optional(),
  category: z.string().optional(),
  duration_minutes: z.number().min(0, "Duration cannot be negative").optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const services = await db.execute(`
      SELECT 
        s.*, 
        b.name as branch_name 
      FROM services s 
      LEFT JOIN branches b ON s.branch_id = b.id 
      ORDER BY s.created_at DESC
    `);
    
    return NextResponse.json({ services: services.rows });
  } catch (error) {
    console.error("Error fetching services:", error);
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
    const result = createServiceSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { name, branch_id, price, points_earned, description, category, duration_minutes } = result.data;
    const finalBranchId = branch_id || null;

    // Check for duplicate name in the same scope (branch or global)
    let existing;
    if (finalBranchId) {
      existing = await db.execute({
        sql: "SELECT id FROM services WHERE name = ? AND branch_id = ?",
        args: [name, finalBranchId]
      });
    } else {
      existing = await db.execute({
        sql: "SELECT id FROM services WHERE name = ? AND branch_id IS NULL",
        args: [name]
      });
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "A service with this name already exists in this scope" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO services (id, name, description, price, points_earned, duration_minutes, category, branch_id, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [id, name, description || "", price, points_earned, duration_minutes || null, category || "", finalBranchId]
    });

    return NextResponse.json({ success: true, service: { id, name, branch_id: finalBranchId, is_active: 1 } });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
