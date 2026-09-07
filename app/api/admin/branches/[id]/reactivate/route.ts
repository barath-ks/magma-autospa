import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can reactivate branches" }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE branches SET is_active = TRUE WHERE id = $1", [id]);
      await client.query("UPDATE users SET is_active = TRUE WHERE branch_id = $1", [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, message: "Branch reactivated successfully" });
  } catch (error) {
    console.error("Error reactivating branch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
