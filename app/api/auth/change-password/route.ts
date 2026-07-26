import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }

    const user = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [session.user.id]
    });

    if (!user.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.rows[0].password_hash as string);
    if (!match) return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute({
      sql: "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      args: [hashedPassword, session.user.id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
