import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.execute("SELECT id, name, location, created_at FROM branches ORDER BY name ASC");
    return NextResponse.json({ branches: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
