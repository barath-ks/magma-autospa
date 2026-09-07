import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admins can delete branches" }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    // Generate a 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const otpId = crypto.randomUUID();

    await db.query(
      `INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at) VALUES ($1, $2, 'phone', $3, 'branch_deletion', $4)`,
      [otpId, session.user.id, hash, expiresAt]
    );

    // TEMP: remove once SMS is configured
    console.log(`[TEMP SMS MOCK] Admin OTP for deleting branch ${id} is: ${otp}`);

    return NextResponse.json({ success: true, message: "OTP sent (mock)" });
  } catch (error) {
    console.error("Error requesting branch delete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
