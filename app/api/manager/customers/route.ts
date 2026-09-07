import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import { customerSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role !== "branch" && role !== "staff" && role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const branchId = (session.user as any).branch_id;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  try {
    let result;
    const args: any[] = [];
    let pIdx = 1;

    if (search.trim() === "") {
      const sql = `SELECT c.* FROM customers c ${isAdmin ? "" : `WHERE c.branch_id = $${pIdx++}`} ORDER BY c.created_at DESC LIMIT 50`;
      if (!isAdmin) args.push(branchId);
      result = await db.query(sql, args);
    } else {
      const searchTerm = `%${search}%`;
      const sql = `SELECT DISTINCT c.* FROM customers c
            LEFT JOIN vehicles v ON v.customer_id = c.id
            WHERE ${isAdmin ? "" : `c.branch_id = $${pIdx++} AND `}
            (c.name LIKE $${pIdx++} OR c.phone LIKE $${pIdx++} OR v.vehicle_number LIKE $${pIdx++}) 
            ORDER BY c.name ASC LIMIT 50`;
      if (!isAdmin) args.push(branchId);
      args.push(searchTerm, searchTerm, searchTerm);
      result = await db.query(sql, args);
    }

    return NextResponse.json({ customers: result.rows });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "branch" && role !== "manager" && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;

  try {
    const body = await request.json();
    const { name, phone, email, vehicle_number, vehicle_type, vehicle_make, vehicle_model } = body;

    if (!name || !phone || !vehicle_number) {
      return NextResponse.json({ error: "Name, phone, and vehicle number are required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanVehicleNum = vehicle_number.toUpperCase().trim();

    // Check duplicate vehicle plate
    const vehicleCheck = await db.query(
      "SELECT id FROM vehicles WHERE vehicle_number = $1",
      [cleanVehicleNum]
    );

    if (vehicleCheck.rows.length > 0) {
      return NextResponse.json({ error: `Vehicle plate '${cleanVehicleNum}' is already registered in the system.` }, { status: 409 });
    }

    // Check if phone number already exists
    const phoneCheck = await db.query(
      "SELECT id, name FROM customers WHERE phone = $1",
      [cleanPhone]
    );

    if (phoneCheck.rows.length > 0) {
      return NextResponse.json({ 
        error: `A customer with phone number '${cleanPhone}' already exists (${phoneCheck.rows[0].name}).` 
      }, { status: 409 });
    }

    const customerId = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    const branchId = staffBranchId;

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO customers (id, name, phone, email, branch_id, points_balance) 
              VALUES ($1, $2, $3, $4, $5, 0)`,
        [customerId, name, cleanPhone, email || null, branchId]
      );
      await client.query(
        `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_make, vehicle_model) 
              VALUES ($1, $2, $3, $4, $5, $6)`,
        [vehicleId, customerId, cleanVehicleNum, vehicle_type || 'car', vehicle_make || null, vehicle_model || null]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ id: customerId, name, phone, email, points_balance: 0 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed: customers.phone")) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
    }
    if (error.message && error.message.includes("UNIQUE constraint failed: vehicles.vehicle_number")) {
      return NextResponse.json({ error: "Vehicle number already exists in the system" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
