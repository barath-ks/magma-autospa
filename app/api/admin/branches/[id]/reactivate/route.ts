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
    await db.batch([
      { sql: "UPDATE branches SET is_active = 1 WHERE id = ?", args: [id] },
      { sql: "UPDATE users SET is_active = 1 WHERE branch_id = ?", args: [id] }
    ]);

    return NextResponse.json({ success: true, message: "Branch reactivated successfully" });
  } catch (error) {
    console.error("Error reactivating branch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
