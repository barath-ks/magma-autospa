import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can delete branches" }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const { otp } = await req.json();

    if (!otp) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    // Verify OTP
    const otpRes = await db.query(
      `SELECT id, code_hash, expires_at 
            FROM otp_codes 
            WHERE user_id = $1 AND purpose = 'branch_deletion' AND used = 0
            ORDER BY created_at DESC LIMIT 1`,
      [session.user.id]
    );

    if (otpRes.rows.length === 0) {
      return NextResponse.json({ error: "No pending OTP found. Please request a new one." }, { status: 400 });
    }

    const latestOtp = otpRes.rows[0];
    const expiresAt = new Date(latestOtp.expires_at as string);

    if (Date.now() > expiresAt.getTime()) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(otp, latestOtp.code_hash as string);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // OTP is valid. Deactivate branch and users atomically.
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE otp_codes SET used = 1 WHERE id = $1", [latestOtp.id]);
      await client.query("UPDATE branches SET is_active = FALSE WHERE id = $1", [id]);
      await client.query("UPDATE users SET is_active = FALSE WHERE branch_id = $1", [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    console.error("Error confirming branch delete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
