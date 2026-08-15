import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    let { service_id, offer_price, branch_id, is_active } = body;
    
    if (branch_id === "") branch_id = null;
    
    const updates = [];
    const args: any[] = [];
    
    if (service_id !== undefined) {
      updates.push("service_id = ?"); args.push(service_id);
    }
    if (offer_price !== undefined) {
      offer_price = Number(offer_price);
      if (isNaN(offer_price) || offer_price <= 0) {
        return NextResponse.json({ error: "Offer price must be > 0" }, { status: 400 });
      }
      updates.push("offer_price = ?"); args.push(offer_price);
    }
    if (branch_id !== undefined) {
      updates.push("branch_id = ?"); args.push(branch_id);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?"); args.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Validation for offer price < service price
    const currentOfferRes = await db.execute({
      sql: "SELECT service_id, offer_price FROM service_offers WHERE id = ?",
      args: [id]
    });
    
    if (currentOfferRes.rows.length === 0) {
      return NextResponse.json({ error: "Service offer not found" }, { status: 404 });
    }
    
    const targetServiceId = service_id !== undefined ? service_id : currentOfferRes.rows[0].service_id;
    const targetOfferPrice = offer_price !== undefined ? offer_price : currentOfferRes.rows[0].offer_price;
    
    if (service_id !== undefined || offer_price !== undefined) {
      const serviceRes = await db.execute({
        sql: "SELECT price FROM services WHERE id = ?",
        args: [targetServiceId]
      });

      if (serviceRes.rows.length > 0) {
        const originalPrice = Number(serviceRes.rows[0].price);
        if (targetOfferPrice >= originalPrice) {
          return NextResponse.json({ error: "Offer price must be strictly less than the original service price" }, { status: 400 });
        }
      }
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE service_offers SET ${updates.join(", ")} WHERE id = ?`,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating service offer:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    // Soft delete
    await db.execute({
      sql: "UPDATE service_offers SET is_active = 0 WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting service offer:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
