import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role !== "staff" && role !== "manager" && role !== "admin") {
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
        sql: `SELECT * FROM customers ${isAdmin ? "" : "WHERE branch_id = ?"} ORDER BY created_at DESC LIMIT 50`,
        args: args,
      });
    } else {
      const searchTerm = `%${search}%`;
      result = await db.execute({
        sql: `SELECT * FROM customers 
              WHERE ${branchFilter}
              (name LIKE ? OR phone LIKE ? OR vehicle_number LIKE ?) 
              ORDER BY name ASC LIMIT 50`,
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
  if (role !== "staff" && role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;
  
  try {
    const body = await request.json();
    const { name, phone, email, vehicle_number, vehicle_model } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: "Name, Phone, and Email are required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO customers (id, name, phone, email, vehicle_number, vehicle_model, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, phone, email, vehicle_number || null, vehicle_model || null, branchId],
    });

    return NextResponse.json({ id, name, phone, email, vehicle_number, vehicle_model, points_balance: 0 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed: customers.phone")) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
