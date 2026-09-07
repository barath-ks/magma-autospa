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
    
    if (!branch_id) {
      return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
    }

    const currentOfferRes = await db.query(
      "SELECT service_id, offer_price, branch_id FROM service_offers WHERE id = $1",
      [id]
    );
    
    if (currentOfferRes.rows.length === 0) {
      return NextResponse.json({ error: "Service offer not found" }, { status: 404 });
    }

    if (currentOfferRes.rows[0].branch_id !== branch_id) {
      return NextResponse.json({ error: "Forbidden: Service offer does not belong to the specified branch" }, { status: 403 });
    }
    
    const updates = [];
    const args: any[] = [];
    let pIdx = 1;
    
    if (service_id !== undefined) {
      updates.push(`service_id = $${pIdx++}`); args.push(service_id);
    }
    if (offer_price !== undefined) {
      offer_price = Number(offer_price);
      if (isNaN(offer_price) || offer_price <= 0) {
        return NextResponse.json({ error: "Offer price must be > 0" }, { status: 400 });
      }
      updates.push(`offer_price = $${pIdx++}`); args.push(offer_price);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${pIdx++}`); args.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const targetServiceId = service_id !== undefined ? service_id : currentOfferRes.rows[0].service_id;
    const targetOfferPrice = offer_price !== undefined ? offer_price : currentOfferRes.rows[0].offer_price;
    
    // Cross-branch check and original price check
    const serviceRes = await db.query(
      "SELECT price, branch_id FROM services WHERE id = $1",
      [targetServiceId]
    );

    if (serviceRes.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (serviceRes.rows[0].branch_id !== branch_id) {
      return NextResponse.json({ error: "Target service does not belong to this branch" }, { status: 400 });
    }

    const originalPrice = Number(serviceRes.rows[0].price);
    if (targetOfferPrice >= originalPrice) {
      return NextResponse.json({ error: "Offer price must be strictly less than the original service price" }, { status: 400 });
    }

    args.push(id);

    await db.query(
      `UPDATE service_offers SET ${updates.join(", ")} WHERE id = $${pIdx}`,
      args
    );

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
  const { searchParams } = new URL(request.url);
  const branch_id = searchParams.get("branch_id");

  if (!branch_id) {
    return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
  }

  try {
    const currentOfferRes = await db.query(
      "SELECT branch_id FROM service_offers WHERE id = $1",
      [id]
    );
    
    if (currentOfferRes.rows.length === 0) {
      return NextResponse.json({ error: "Service offer not found" }, { status: 404 });
    }

    if (currentOfferRes.rows[0].branch_id !== branch_id) {
      return NextResponse.json({ error: "Forbidden: Service offer does not belong to the specified branch" }, { status: 403 });
    }

    // Soft delete
    await db.query(
      "UPDATE service_offers SET is_active = FALSE WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting service offer:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
