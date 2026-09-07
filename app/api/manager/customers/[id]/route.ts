import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role !== "branch" && role !== "staff" && role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const branchId = (session.user as any).branch_id;
  
  try {
    const { id } = await params;
    
    const customerResult = await db.query(
      `SELECT * FROM customers WHERE id = $1 ${isAdmin ? "" : "AND branch_id = $2"}`,
      isAdmin ? [id] : [id, branchId]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerResult.rows[0];

    // Fetch visit history (transactions + services)
    const historyResult = await db.query(
      `
        SELECT t.id, t.created_at, t.total_amount, t.points_awarded, t.status, t.payment_method, t.vehicle_model, t.vehicle_number, u.name as staff_name, b.name as branch_name,
               (
                 SELECT COALESCE(json_agg(json_build_object('name', s.name, 'price', ts.price_at_time)), '[]'::json)
                 FROM transaction_services ts
                 JOIN services s ON ts.service_id = s.id
                 WHERE ts.transaction_id = t.id
               ) as services
        FROM transactions t
        LEFT JOIN users u ON t.staff_id = u.id
        LEFT JOIN branches b ON t.branch_id = b.id
        WHERE t.customer_id = $1
        ORDER BY t.created_at DESC
      `,
      [id]
    );

    const history = historyResult.rows.map(row => ({
      ...row,
      services: typeof (row as any).services === 'string' ? JSON.parse((row as any).services) : ((row as any).services || [])
    }));

    // Fetch vehicles
    const vehiclesResult = await db.query(
      `SELECT * FROM vehicles WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
      [id]
    );

    // Fetch ledger
    const ledgerResult = await db.query(
      `SELECT * FROM loyalty_points_ledger WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    let totalEarned = 0;
    let totalRedeemed = 0;
    ledgerResult.rows.forEach((row: any) => {
      if (row.type === 'earned') totalEarned += Number(row.points);
      if (row.type === 'redeemed') totalRedeemed += Number(row.points);
    });

    return NextResponse.json({
      customer,
      vehicles: vehiclesResult.rows,
      history,
      ledger: ledgerResult.rows,
      stats: { totalEarned, totalRedeemed }
    });

  } catch (error) {
    console.error("Error fetching customer details:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "branch" && role !== "manager" && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const staffBranchId = (session.user as any).branch_id;
  const { id } = await params;

  try {
    const body = await request.json();

    // Check for protected fields being passed directly
    const protectedFields = ["points_balance", "branch_id", "id"];
    const hasProtectedField = protectedFields.some(field => field in body);
    if (hasProtectedField) {
      return NextResponse.json(
        { error: "Attempted to modify protected fields. Points balance, branch ID, and ID cannot be updated through this endpoint." }, 
        { status: 400 }
      );
    }

    // Explicit allowlist extraction
    const { name, phone, email } = body;

    const validationResult = customerSchema.safeParse({ name, phone, email });
    if (!validationResult.success) {
      const msg = validationResult.error.issues?.[0]?.message || "Invalid customer details.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check if phone belongs to another customer
    const phoneConflict = await db.query(
      `SELECT id, name FROM customers WHERE phone = $1 AND id != $2`,
      [cleanPhone, id]
    );
    if (phoneConflict.rows.length > 0) {
      const conflictingName = phoneConflict.rows[0].name;
      return NextResponse.json({ 
        error: `Phone number ${cleanPhone} is already in use by customer ${conflictingName}.` 
      }, { status: 409 });
    }

    // Verify ownership for non-admin
    if (!isAdmin) {
      const verifyRes = await db.query(
        `SELECT id FROM customers WHERE id = $1 AND branch_id = $2`,
        [id, staffBranchId]
      );
      if (verifyRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden: Customer belongs to another branch or does not exist." }, { status: 403 });
      }
    }

    await db.query(
      `UPDATE customers SET name = $1, phone = $2, email = $3 WHERE id = $4`,
      [name.trim(), cleanPhone, email ? email.trim() : null, id]
    );

    return NextResponse.json({ success: true, message: "Customer profile updated successfully." });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Phone number or email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
