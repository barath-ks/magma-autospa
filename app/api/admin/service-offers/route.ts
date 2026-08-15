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
        so.*, 
        s.name as service_name,
        s.price as original_price,
        b.name as branch_name 
      FROM service_offers so
      JOIN services s ON so.service_id = s.id
      LEFT JOIN branches b ON so.branch_id = b.id
      ORDER BY so.created_at DESC
    `);
    
    return NextResponse.json({ serviceOffers: res.rows });
  } catch (error: any) {
    console.error("Error fetching service offers:", error);
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
    let { service_id, offer_price, branch_id, is_active } = body;
    
    if (branch_id === "") branch_id = null;
    offer_price = Number(offer_price);

    if (!service_id || isNaN(offer_price) || offer_price <= 0) {
      return NextResponse.json({ error: "Valid service ID and offer price > 0 are required" }, { status: 400 });
    }

    const serviceRes = await db.execute({
      sql: "SELECT price FROM services WHERE id = ?",
      args: [service_id]
    });

    if (serviceRes.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const originalPrice = Number(serviceRes.rows[0].price);
    if (offer_price >= originalPrice) {
      return NextResponse.json({ error: "Offer price must be strictly less than the original service price" }, { status: 400 });
    }

    const id = uuidv4();

    await db.execute({
      sql: `INSERT INTO service_offers (id, service_id, offer_price, branch_id, is_active) VALUES (?, ?, ?, ?, ?)`,
      args: [id, service_id, offer_price, branch_id, is_active === undefined ? 1 : (is_active ? 1 : 0)]
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error creating service offer:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
