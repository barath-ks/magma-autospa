import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const comboSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  bundle_price: z.number().min(0, "Bundle price cannot be negative"),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
  service_ids: z.array(z.string()).min(2, "A combo must include at least two services"),
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
    const combos = await db.query(`
      SELECT 
        c.*, 
        b.name as branch_name 
      FROM combos c 
      LEFT JOIN branches b ON c.branch_id = b.id 
      ORDER BY c.created_at DESC
    `);
    
    // Fetch related services for each combo
    const comboServices = await db.query(`
      SELECT cs.combo_id, s.id as service_id, s.name as service_name
      FROM combo_services cs
      JOIN services s ON cs.service_id = s.id
    `);

    // Group services by combo
    const combosWithServices = combos.rows.map(c => {
      const related = comboServices.rows.filter(cs => cs.combo_id === c.id);
      return {
        ...c,
        services: related
      };
    });
    
    return NextResponse.json({ combos: combosWithServices });
  } catch (error) {
    console.error("Error fetching combos:", error);
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
    const result = comboSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { 
      name, description, bundle_price, start_date, end_date, branch_id, service_ids 
    } = result.data;
    
    const finalBranchId = branch_id || null;

    let existing;
    if (finalBranchId) {
      existing = await db.query(
        "SELECT id FROM combos WHERE name = $1 AND branch_id = $2",
        [name, finalBranchId]
      );
    } else {
      existing = await db.query(
        "SELECT id FROM combos WHERE name = $1 AND branch_id IS NULL",
        [name]
      );
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "A combo with this name already exists in this scope" }, { status: 400 });
    }

    const id = uuidv4();
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO combos 
              (id, name, description, bundle_price, start_date, end_date, branch_id, is_active) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
        [id, name, description || "", bundle_price, start_date || null, end_date || null, finalBranchId]
      );

      for (const svcId of service_ids) {
        await client.query(
          "INSERT INTO combo_services (combo_id, service_id) VALUES ($1, $2)",
          [id, svcId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (txnErr) {
      await client.query("ROLLBACK");
      throw txnErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
