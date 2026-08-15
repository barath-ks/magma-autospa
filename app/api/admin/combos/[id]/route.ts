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
    let { name, description, bundle_price, branch_id, services, is_active } = body;
    
    if (branch_id === "") branch_id = null;
    
    const statements: any[] = [];
    
    const updates = [];
    const args: any[] = [];
    
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      updates.push("name = ?"); args.push(name);
    }
    if (description !== undefined) {
      updates.push("description = ?"); args.push(description);
    }
    if (bundle_price !== undefined) {
      bundle_price = Number(bundle_price);
      if (isNaN(bundle_price) || bundle_price <= 0) {
        return NextResponse.json({ error: "Bundle price must be > 0" }, { status: 400 });
      }
      updates.push("bundle_price = ?"); args.push(bundle_price);
    }
    if (branch_id !== undefined) {
      updates.push("branch_id = ?"); args.push(branch_id);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?"); args.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      args.push(id);
      statements.push({
        sql: `UPDATE combos SET ${updates.join(", ")} WHERE id = ?`,
        args
      });
    }

    if (services !== undefined) {
      if (!Array.isArray(services) || services.length < 2) {
        return NextResponse.json({ error: "A combo must include at least 2 services" }, { status: 400 });
      }
      
      statements.push({
        sql: `DELETE FROM combo_services WHERE combo_id = ?`,
        args: [id]
      });
      
      for (const serviceId of services) {
        statements.push({
          sql: `INSERT INTO combo_services (combo_id, service_id) VALUES (?, ?)`,
          args: [id, serviceId]
        });
      }
    }

    if (statements.length > 0) {
      await db.batch(statements, "write");
    } else {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating combo:", error);
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
      sql: "UPDATE combos SET is_active = 0 WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting combo:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
