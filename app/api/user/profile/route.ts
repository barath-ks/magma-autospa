import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const result = await db.execute({
      sql: `SELECT u.name, u.login_id, u.role, u.phone, u.email, b.name as branch_name 
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = ?`,
      args: [userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      name: user.name,
      login_id: user.login_id,
      role: user.role,
      phone: user.phone || "",
      email: user.email || "",
      branch_name: user.role === 'admin' ? "All Branches" : (user.branch_name || "Unknown Branch"),
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { phone, email } = body;

    // Direct update, no approval needed for phone/email
    await db.execute({
      sql: `UPDATE users SET phone = ?, email = ? WHERE id = ?`,
      args: [phone || null, email || null, userId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
