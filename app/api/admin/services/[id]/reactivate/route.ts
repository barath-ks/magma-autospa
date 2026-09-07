import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  
  try {
    const body = await request.json();
    const { branch_id } = body;

    if (!branch_id) {
      return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
    }

    // Verify branch ownership
    const serviceRes = await db.query(
      `SELECT branch_id FROM services WHERE id = $1`,
      [id]
    );

    if (serviceRes.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (serviceRes.rows[0].branch_id !== branch_id) {
      return NextResponse.json({ error: "Forbidden: Service does not belong to the specified branch" }, { status: 403 });
    }

    // Reactivate
    await db.query(
      `UPDATE services SET is_active = TRUE WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reactivating service:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
