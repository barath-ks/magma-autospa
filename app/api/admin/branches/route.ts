import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const createBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  location: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  must_change_password: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const branches = await db.query(`
      SELECT 
        b.id, b.name, b.code, b.branch_code, b.email, b.display_password, b.must_change_password, b.location, b.phone, b.is_active, b.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role = 'staff' AND u.is_active = TRUE) as active_staff_count,
        (SELECT u.id FROM users u WHERE u.branch_id = b.id AND u.role = 'manager' AND u.is_active = TRUE LIMIT 1) as manager_id,
        (SELECT u.name FROM users u WHERE u.branch_id = b.id AND u.role = 'manager' AND u.is_active = TRUE LIMIT 1) as manager_name
      FROM branches b
      ORDER BY b.created_at DESC
    `);
    
    return NextResponse.json({ branches: branches.rows });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = createBranchSchema.safeParse(body);
    
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    const { name, code, location, phone, email, password, must_change_password } = result.data;
    const branchCode = code.toUpperCase();
    const branchEmail = email && email.trim() !== "" ? email.trim() : `${code.toLowerCase()}@magma-autospa.com`;

    // Check for duplicate code, name, or email
    const existing = await db.query(
      `SELECT id FROM branches 
            WHERE (LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($2) OR LOWER(branch_code) = LOWER($3) OR LOWER(email) = LOWER($4))`,
      [name, code, branchCode, branchEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "A branch with this name, code, or email already exists" }, { status: 400 });
    }

    // Determine temporary password
    const tempPassword = password && password.trim() !== "" ? password.trim() : `Magma@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const mustChange = must_change_password !== undefined ? (must_change_password ? 1 : 0) : 1;

    const id = uuidv4();
    await db.query(
      `INSERT INTO branches (
              id, name, code, branch_code, email, password_hash, display_password, 
              must_change_password, location, address, phone, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)`,
      [id, name, code, branchCode, branchEmail, passwordHash, tempPassword, mustChange, location, location, phone]
    );

    return NextResponse.json({ 
      success: true, 
      branch: { 
        id, 
        name, 
        code, 
        branch_code: branchCode, 
        email: branchEmail, 
        display_password: tempPassword,
        must_change_password: mustChange,
        location, 
        phone, 
        is_active: 1 
      } 
    });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
