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
    const branchFilter = isAdmin ? "" : "branch_id = ? AND ";
    const args = isAdmin ? [] : [branchId];

    if (search.trim() === "") {
      result = await db.execute({
        sql: `SELECT c.* FROM customers c ${isAdmin ? "" : "WHERE c.branch_id = ?"} ORDER BY c.created_at DESC LIMIT 50`,
        args: args,
      });
    } else {
      const searchTerm = `%${search}%`;
      result = await db.execute({
        sql: `SELECT DISTINCT c.* FROM customers c
              LEFT JOIN vehicles v ON v.customer_id = c.id
              WHERE ${isAdmin ? "" : "c.branch_id = ? AND "}
              (c.name LIKE ? OR c.phone LIKE ? OR v.vehicle_number LIKE ?) 
              ORDER BY c.name ASC LIMIT 50`,
        args: [...args, searchTerm, searchTerm, searchTerm],
      });
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
  if (role !== "branch" && role !== "staff" && role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;
  
  try {
    const body = await request.json();
    const { name, phone, email, vehicle_number, vehicle_type, vehicle_model, vehicle_make } = body;

    const validationResult = customerSchema.safeParse({ name, phone, email });
    if (!validationResult.success) {
      const msg = validationResult.error.issues?.[0]?.message || "Invalid customer details";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Pre-flight check for phone uniqueness
    const existingPhone = await db.execute({
      sql: "SELECT id, name FROM customers WHERE phone = ?",
      args: [cleanPhone]
    });
    if (existingPhone.rows.length > 0) {
      const existingName = existingPhone.rows[0].name;
      return NextResponse.json({ 
        error: `A customer with phone number ${cleanPhone} is already registered (${existingName}).` 
      }, { status: 409 });
    }
    
    if (!vehicle_number || !vehicle_type) {
      return NextResponse.json({ error: "Initial vehicle number and type are required" }, { status: 400 });
    }

    const vNum = vehicle_number.toUpperCase().trim();

    // Pre-flight check for vehicle number uniqueness
    const existingVehicle = await db.execute({
      sql: "SELECT id FROM vehicles WHERE vehicle_number = ?",
      args: [vNum]
    });
    if (existingVehicle.rows.length > 0) {
      return NextResponse.json({ 
        error: `Vehicle plate ${vNum} is already registered in the system.` 
      }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    
    const statements = [
      {
        sql: `INSERT INTO customers (id, name, phone, email, branch_id)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, name.trim(), cleanPhone, email ? email.trim() : null, branchId]
      },
      {
        sql: `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_model, vehicle_make)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [vehicleId, id, vNum, vehicle_type, vehicle_model || null, vehicle_make || null]
      }
    ];

    await db.batch(statements, "write");

    return NextResponse.json({ id, name, phone, email, points_balance: 0 });
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
