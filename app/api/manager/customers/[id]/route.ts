import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role !== "staff" && role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const branchId = (session.user as any).branch_id;
  
  try {
    const { id } = await params;
    
    const customerResult = await db.execute({
      sql: `SELECT * FROM customers WHERE id = ? ${isAdmin ? "" : "AND branch_id = ?"}`,
      args: isAdmin ? [id] : [id, branchId],
    });

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = customerResult.rows[0];

    // Fetch visit history (transactions + services)
    const historyResult = await db.execute({
      sql: `
        SELECT t.id, t.created_at, t.total_amount, t.points_awarded, t.status, t.vehicle_model, t.vehicle_number, u.name as staff_name, b.name as branch_name,
               (
                 SELECT json_group_array(json_object('name', s.name, 'price', ts.price_at_time))
                 FROM transaction_services ts
                 JOIN services s ON ts.service_id = s.id
                 WHERE ts.transaction_id = t.id
               ) as services
        FROM transactions t
        LEFT JOIN users u ON t.staff_id = u.id
        LEFT JOIN branches b ON t.branch_id = b.id
        WHERE t.customer_id = ?
        ORDER BY t.created_at DESC
      `,
      args: [id],
    });

    const history = historyResult.rows.map(row => ({
      ...row,
      services: JSON.parse((row as any).services || "[]")
    }));

    // Fetch vehicles
    const vehiclesResult = await db.execute({
      sql: `SELECT * FROM vehicles WHERE customer_id = ? AND is_active = 1 ORDER BY created_at ASC`,
      args: [id]
    });

    // Fetch ledger
    const ledgerResult = await db.execute({
      sql: `SELECT * FROM loyalty_points_ledger WHERE customer_id = ? ORDER BY created_at DESC`,
      args: [id]
    });

    let totalEarned = 0;
    let totalRedeemed = 0;
    ledgerResult.rows.forEach((row: any) => {
      if (row.type === 'earned') totalEarned += row.points;
      if (row.type === 'redeemed') totalRedeemed += row.points;
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
  if (role !== "staff" && role !== "manager" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "admin";
  const branchId = (session.user as any).branch_id;
  
  try {
    const { id } = await params;
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

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required." }, { status: 400 });
    }

    // Verify ownership for non-admin
    if (!isAdmin) {
      const verifyRes = await db.execute({
        sql: `SELECT id FROM customers WHERE id = ? AND branch_id = ?`,
        args: [id, branchId]
      });
      if (verifyRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden: Customer belongs to another branch or does not exist." }, { status: 403 });
      }
    }

    await db.execute({
      sql: `UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?`,
      args: [name, phone, email || null, id]
    });

    return NextResponse.json({ success: true, message: "Customer profile updated successfully." });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Phone number or email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
