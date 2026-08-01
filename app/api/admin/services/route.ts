import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await db.execute("SELECT * FROM services ORDER BY created_at DESC");
    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, price } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (Number(price) <= 0) {
      return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.execute({
      sql: `SELECT id FROM services WHERE LOWER(name) = LOWER(?)`,
      args: [name.trim()]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "A service with this name already exists" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO services (id, name, description, price, points_earned, is_active)
            VALUES (?, ?, ?, ?, 0, 1)`,
      args: [id, name, description || '', Number(price)],
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
