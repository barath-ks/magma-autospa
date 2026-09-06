import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  code: z.string().min(2, "Code must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  location: z.string().min(3, "Address must be at least 3 characters").optional(),
  phone: z.string().min(7, "Phone must be at least 7 characters").optional().or(z.literal("")).nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")).nullable(),
  must_change_password: z.boolean().optional(),
  is_active: z.boolean().optional(),
  manager_id: z.string().nullable().optional(), 
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const branchRes = await db.execute({
      sql: `
        SELECT 
          b.id, b.name, b.code, b.branch_code, b.email, b.display_password, b.must_change_password, b.location, b.phone, b.is_active, b.created_at,
          (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role = 'staff' AND u.is_active = 1) as active_staff_count,
          (SELECT u.id FROM users u WHERE u.branch_id = b.id AND u.role = 'manager' AND u.is_active = 1 LIMIT 1) as manager_id,
          (SELECT u.name FROM users u WHERE u.branch_id = b.id AND u.role = 'manager' AND u.is_active = 1 LIMIT 1) as manager_name
        FROM branches b
        WHERE b.id = ?
      `,
      args: [id]
    });
    
    if (branchRes.rows.length === 0) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ branch: branchRes.rows[0] });
  } catch (error) {
    console.error("Error fetching branch:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = updateBranchSchema.safeParse(body);
    
    if (!result.success) {
      const firstError = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || "Invalid branch update parameters";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    
    const { name, code, email, location, phone, password, must_change_password, is_active, manager_id } = result.data;

    // Inspect available columns in branches table
    const tableInfo = await db.execute("PRAGMA table_info(branches)");
    const availableColumns = new Set(tableInfo.rows.map((r: any) => r.name));

    // Build dynamic update for branch
    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined && availableColumns.has("name")) {
      updates.push("name = ?");
      args.push(name.trim());
    }

    if (code !== undefined) {
      if (availableColumns.has("code")) {
        updates.push("code = ?");
        args.push(code.trim());
      }
      if (availableColumns.has("branch_code")) {
        updates.push("branch_code = ?");
        args.push(code.trim().toUpperCase());
      }
    }

    if (email !== undefined && availableColumns.has("email")) {
      const cleanEmail = email && email.trim() !== "" ? email.trim() : null;
      updates.push("email = ?");
      args.push(cleanEmail);
    }

    if (location !== undefined) {
      if (availableColumns.has("location")) {
        updates.push("location = ?");
        args.push(location.trim());
      }
      if (availableColumns.has("address")) {
        updates.push("address = ?");
        args.push(location.trim());
      }
    }

    if (phone !== undefined && availableColumns.has("phone")) {
      updates.push("phone = ?");
      args.push(phone && phone.trim() !== "" ? phone.trim() : null);
    }

    if (is_active !== undefined && availableColumns.has("is_active")) {
      updates.push("is_active = ?");
      args.push(is_active ? 1 : 0);
    }

    if (password !== undefined && password !== null && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      if (availableColumns.has("password_hash")) {
        updates.push("password_hash = ?");
        args.push(hashedPassword);
      }
      if (availableColumns.has("display_password")) {
        updates.push("display_password = ?");
        args.push(password.trim());
      }
      if (availableColumns.has("must_change_password")) {
        const mustChangeVal = must_change_password !== undefined ? (must_change_password ? 1 : 0) : 1;
        updates.push("must_change_password = ?");
        args.push(mustChangeVal);
      }
    } else if (must_change_password !== undefined && availableColumns.has("must_change_password")) {
      updates.push("must_change_password = ?");
      args.push(must_change_password ? 1 : 0);
    }

    const txn = await db.transaction("write");

    try {
      if (updates.length > 0) {
        // If code, name, or email is updated, ensure no duplicates
        const checkConditions: string[] = [];
        const checkArgs: any[] = [];

        if (name !== undefined && availableColumns.has("name")) {
          checkConditions.push("name = ? COLLATE NOCASE");
          checkArgs.push(name.trim());
        }
        if (code !== undefined) {
          if (availableColumns.has("code")) {
            checkConditions.push("code = ? COLLATE NOCASE");
            checkArgs.push(code.trim());
          }
          if (availableColumns.has("branch_code")) {
            checkConditions.push("branch_code = ? COLLATE NOCASE");
            checkArgs.push(code.trim().toUpperCase());
          }
        }
        if (email !== undefined && email && email.trim() !== "" && availableColumns.has("email")) {
          checkConditions.push("email = ? COLLATE NOCASE");
          checkArgs.push(email.trim());
        }

        if (checkConditions.length > 0) {
          const existing = await txn.execute({
            sql: `SELECT id FROM branches WHERE (${checkConditions.join(" OR ")}) AND id != ? LIMIT 1`,
            args: [...checkArgs, id]
          });
          
          if (existing.rows.length > 0) {
            throw new Error("DUPLICATE_NAME_OR_CODE");
          }
        }
      
        args.push(id);
        await txn.execute({
          sql: `UPDATE branches SET ${updates.join(", ")} WHERE id = ?`,
          args,
        });
      }

      // Handle Manager Assignment
      if (manager_id !== undefined) {
        if (manager_id === null || manager_id === "") {
          // Detach current manager(s)
          await txn.execute({
            sql: "UPDATE users SET branch_id = NULL WHERE branch_id = ? AND role = 'manager'",
            args: [id]
          });
        } else {
          // Validate the new manager exists and is active manager
          const mgrCheck = await txn.execute({
            sql: "SELECT id FROM users WHERE id = ? AND role = 'manager' AND is_active = 1",
            args: [manager_id]
          });
          
          if (mgrCheck.rows.length === 0) {
            throw new Error("INVALID_MANAGER");
          }
          
          // Detach existing manager(s)
          await txn.execute({
            sql: "UPDATE users SET branch_id = NULL WHERE branch_id = ? AND role = 'manager'",
            args: [id]
          });
          
          // Assign the new manager
          await txn.execute({
            sql: "UPDATE users SET branch_id = ? WHERE id = ?",
            args: [id, manager_id]
          });
        }
      }

      await txn.commit();
      return NextResponse.json({ success: true });
    } catch (txnError: any) {
      await txn.rollback();
      if (txnError.message === "DUPLICATE_NAME_OR_CODE") {
        return NextResponse.json({ error: "A branch with this name, code, or email already exists" }, { status: 400 });
      }
      if (txnError.message === "INVALID_MANAGER") {
        return NextResponse.json({ error: "Invalid manager_id: user does not exist or is not an active manager" }, { status: 400 });
      }
      console.error("[BRANCH_UPDATE_TXN_ERROR] Transaction failed for branch id:", id, txnError);
      throw txnError;
    }
  } catch (error: any) {
    console.error("[BRANCH_UPDATE_ERROR] Branch update failed for id:", id, {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json({ 
      error: error?.message ? `Database error: ${error.message}` : "Database error occurred while updating branch." 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    // Soft delete
    await db.execute({
      sql: "UPDATE branches SET is_active = 0 WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
