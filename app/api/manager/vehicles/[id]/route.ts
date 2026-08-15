import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;
  const { id: vehicleId } = await params;

  try {
    const body = await request.json();
    let { vehicle_number, vehicle_type, vehicle_model, is_active } = body;

    // Verify branch isolation (customer must belong to manager's branch unless admin)
    const vehicleRes = await db.execute({
      sql: `SELECT v.id, c.branch_id FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id = ?`,
      args: [vehicleId]
    });

    if (vehicleRes.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (role !== "admin" && vehicleRes.rows[0].branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Forbidden: Vehicle belongs to a customer in a different branch" }, { status: 403 });
    }

    // Build update query
    const updates = [];
    const args = [];

    if (vehicle_number !== undefined) {
      updates.push("vehicle_number = ?");
      args.push(vehicle_number.toUpperCase().trim());
    }
    if (vehicle_type !== undefined) {
      updates.push("vehicle_type = ?");
      args.push(vehicle_type);
    }
    if (vehicle_model !== undefined) {
      updates.push("vehicle_model = ?");
      args.push(vehicle_model);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      args.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(vehicleId);

    await db.execute({
      sql: `UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`,
      args: args,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed: vehicles.vehicle_number")) {
      return NextResponse.json({ error: "Vehicle number already exists in the system" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
