import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import bcrypt from "bcryptjs";
import { checkPasswordReuse } from "../../../../lib/password-history";
import { validatePasswordStrength } from "../../../../lib/password-strength";
import { v4 as uuidv4 } from "uuid";

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

    const user = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [session.user.id]
    );

    if (!user.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.rows[0].password_hash as string);
    if (!match) return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const isReused = await checkPasswordReuse(session.user.id, newPassword, user.rows[0].password_hash as string);
    if (isReused) {
      return NextResponse.json({ error: "This password has been used before, please choose a different one" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO password_history (id, user_id, password_hash) VALUES ($1, $2, $3)",
        [uuidv4(), session.user.id, hashedPassword]
      );
      await client.query(
        "UPDATE users SET password_hash = $1, must_change_password = 0 WHERE id = $2",
        [hashedPassword, session.user.id]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
