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

    const comboRes = await db.execute({
      sql: `SELECT branch_id FROM combos WHERE id = ?`,
      args: [id]
    });

    if (comboRes.rows.length === 0) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }

    if (comboRes.rows[0].branch_id !== branch_id) {
      return NextResponse.json({ error: "Forbidden: Combo does not belong to the specified branch" }, { status: 403 });
    }

    // Reactivate
    await db.execute({
      sql: `UPDATE combos SET is_active = 1 WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reactivating combo:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
