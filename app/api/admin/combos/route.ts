import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await db.execute(`
      SELECT 
        c.*, 
        b.name as branch_name 
      FROM combos c
      LEFT JOIN branches b ON c.branch_id = b.id
      ORDER BY c.created_at DESC
    `);
    
    const combos = res.rows.map(r => ({ ...r, services: [] }));
    
    if (combos.length > 0) {
      const comboIds = combos.map(c => `'${c.id}'`).join(',');
      const servicesRes = await db.execute(`
        SELECT 
          cs.combo_id, 
          s.id as service_id, 
          s.name as service_name, 
          s.price as original_price
        FROM combo_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.combo_id IN (${comboIds})
      `);
      
      for (const cs of servicesRes.rows) {
        const combo = combos.find(c => c.id === cs.combo_id);
        if (combo) {
          combo.services.push({
            id: cs.service_id,
            name: cs.service_name,
            original_price: cs.original_price
          });
        }
      }
    }
    
    return NextResponse.json({ combos });
  } catch (error: any) {
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    let { name, description, bundle_price, branch_id, services, is_active } = body;
    
    if (branch_id === "") branch_id = null;
    bundle_price = Number(bundle_price);

    if (!name || isNaN(bundle_price) || bundle_price <= 0) {
      return NextResponse.json({ error: "Name and bundle price > 0 are required" }, { status: 400 });
    }

    if (!Array.isArray(services) || services.length < 2) {
      return NextResponse.json({ error: "A combo must include at least 2 services" }, { status: 400 });
    }

    const id = uuidv4();

    // Start batch transaction
    const statements = [
      {
        sql: `INSERT INTO combos (id, name, description, bundle_price, branch_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, name, description || "", bundle_price, branch_id, is_active === undefined ? 1 : (is_active ? 1 : 0)]
      }
    ];

    for (const serviceId of services) {
      statements.push({
        sql: `INSERT INTO combo_services (combo_id, service_id) VALUES (?, ?)`,
        args: [id, serviceId]
      });
    }

    await db.batch(statements, "write");

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
