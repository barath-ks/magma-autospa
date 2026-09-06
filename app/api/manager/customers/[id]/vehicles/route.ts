import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(
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
  const { id: customerId } = await params;

  try {
    const body = await request.json();
    let { vehicle_number, vehicle_type, vehicle_model, vehicle_make } = body;

    if (!vehicle_number || !vehicle_type) {
      return NextResponse.json({ error: "Vehicle number and type are required" }, { status: 400 });
    }

    vehicle_number = vehicle_number.toUpperCase().trim();

    // Verify branch isolation (customer must belong to manager's branch unless admin)
    const customerRes = await db.execute({
      sql: `SELECT branch_id FROM customers WHERE id = ?`,
      args: [customerId]
    });

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (role !== "admin" && customerRes.rows[0].branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Forbidden: Customer belongs to a different branch" }, { status: 403 });
    }

    // Check plate uniqueness
    const existingVehicle = await db.execute({
      sql: "SELECT id FROM vehicles WHERE vehicle_number = ?",
      args: [vehicle_number]
    });
    if (existingVehicle.rows.length > 0) {
      return NextResponse.json({ 
        error: `Vehicle plate ${vehicle_number} is already registered in the system.` 
      }, { status: 409 });
    }

    const vehicleId = uuidv4();
    
    await db.execute({
      sql: `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_model, vehicle_make)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [vehicleId, customerId, vehicle_number, vehicle_type, vehicle_model || null, vehicle_make || null],
    });

    return NextResponse.json({ 
      id: vehicleId, 
      customer_id: customerId, 
      vehicle_number, 
      vehicle_type, 
      vehicle_model,
      vehicle_make: vehicle_make || null
    });

  } catch (error: any) {
    console.error("Error creating vehicle:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed: vehicles.vehicle_number")) {
      return NextResponse.json({ error: "Vehicle number already exists in the system" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
