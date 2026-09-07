import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "@/lib/password-strength";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user as any).role !== "branch") {
    return NextResponse.json({ error: "Unauthorized: Branch session required" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
    }

    const branchRes = await db.query(
      "SELECT password_hash FROM branches WHERE id = $1 AND is_active = TRUE",
      [session.user.id]
    );

    if (!branchRes.rows.length) {
      return NextResponse.json({ error: "Branch profile not found." }, { status: 404 });
    }

    const currentHash = branchRes.rows[0].password_hash as string;
    const match = await bcrypt.compare(currentPassword, currentHash);
    if (!match) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update branch password_hash, display_password, and clear must_change_password
    await db.query(
      `UPDATE branches 
            SET password_hash = $1, 
                display_password = $2, 
                must_change_password = 0 
            WHERE id = $3`,
      [hashedPassword, newPassword, session.user.id]
    );

    return NextResponse.json({ 
      success: true, 
      message: "Branch credentials successfully updated." 
    });
  } catch (error: any) {
    console.error("Branch change password error:", error);
    return NextResponse.json({ error: "Internal server error occurred while updating password." }, { status: 500 });
  }
}
