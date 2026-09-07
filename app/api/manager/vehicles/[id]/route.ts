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
  if (role !== "branch" && role !== "manager" && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;
  const { id: vehicleId } = await params;

  try {
    const body = await request.json();
    const { vehicle_number, vehicle_type, vehicle_model, vehicle_make, is_active } = body;

    // Verify branch isolation (customer must belong to manager's branch unless admin)
    const vehicleRes = await db.query(
      `SELECT v.id, c.branch_id FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id = $1`,
      [vehicleId]
    );

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
      const vNum = vehicle_number.toUpperCase().trim();
      const conflict = await db.query(
        "SELECT id FROM vehicles WHERE vehicle_number = $1 AND id != $2",
        [vNum, vehicleId]
      );
      if (conflict.rows.length > 0) {
        return NextResponse.json({ error: `Vehicle plate ${vNum} is already registered to another vehicle` }, { status: 409 });
      }
      updates.push(`vehicle_number = $${args.length + 1}`);
      args.push(vNum);
    }
    if (vehicle_type !== undefined) {
      updates.push(`vehicle_type = $${args.length + 1}`);
      args.push(vehicle_type);
    }
    if (vehicle_make !== undefined) {
      updates.push(`vehicle_make = $${args.length + 1}`);
      args.push(vehicle_make || null);
    }
    if (vehicle_model !== undefined) {
      updates.push(`vehicle_model = $${args.length + 1}`);
      args.push(vehicle_model || null);
    }
    if (is_active !== undefined) {
      /* SQLite flag: integer boolean is_active (1 or 0) */
      updates.push(`is_active = $${args.length + 1}`);
      args.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(vehicleId);

    await db.query(
      `UPDATE vehicles SET ${updates.join(", ")} WHERE id = $${args.length}`,
      args
    );

    return NextResponse.json({ success: true, message: "Vehicle updated successfully" });

  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    if (error.message && (error.message.includes("UNIQUE constraint failed: vehicles.vehicle_number") || error.code === "23505")) {
      return NextResponse.json({ error: "Vehicle number already exists in the system" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "branch" && role !== "manager" && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;
  const { id: vehicleId } = await params;

  try {
    const vehicleRes = await db.query(
      `SELECT v.id, c.branch_id FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id = $1`,
      [vehicleId]
    );

    if (vehicleRes.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (role !== "admin" && vehicleRes.rows[0].branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Forbidden: Vehicle belongs to a customer in a different branch" }, { status: 403 });
    }

    await db.query(
      "DELETE FROM vehicles WHERE id = $1",
      [vehicleId]
    );

    return NextResponse.json({ success: true, message: "Vehicle removed successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
