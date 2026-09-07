import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager" && (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await db.query(
      `SELECT * FROM services WHERE is_active = TRUE ORDER BY category, name ASC`
    );
    return NextResponse.json({ services: res.rows });
  } catch (error) {
    console.error("Error fetching staff services:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
