import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;
  const staffId = session.user.id; // person who created it

  try {
    const body = await request.json();
    const { 
      vehicle_make, 
      vehicle_plate, 
      service_id, 
      assigned_to, 
      customer_name, 
      customer_phone 
    } = body;

    if (!vehicle_make || !service_id) {
      return NextResponse.json({ error: "Vehicle Make and Service Level are required" }, { status: 400 });
    }
    
    if (!customer_name || !customer_phone) {
      return NextResponse.json({ error: "Customer Name and Phone Number are strictly required" }, { status: 400 });
    }

    // 1. Get Service details
    const serviceRes = await db.execute({
      sql: `SELECT price, points_earned FROM services WHERE id = ? AND is_active = 1`,
      args: [service_id]
    });
    
    if (serviceRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid or inactive service selected" }, { status: 400 });
    }
    const service = serviceRes.rows[0];

    // 2. Handle Customer
    let customerId = uuidv4();
    const phone = customer_phone.trim();
    const name = customer_name.trim();
    const batchStatements = [];

    // Check if customer exists by phone
    const existingCust = await db.execute({
      sql: `SELECT id FROM customers WHERE phone = ?`,
      args: [phone]
    });

    if (existingCust.rows.length > 0) {
      customerId = existingCust.rows[0].id as string;
      // Update their vehicle info
      batchStatements.push({
        sql: `UPDATE customers SET vehicle_model = ?, vehicle_number = ? WHERE id = ?`,
        args: [vehicle_make, vehicle_plate || null, customerId]
      });
    } else {
      // Create new customer
      batchStatements.push({
        sql: `INSERT INTO customers (id, phone, name, branch_id, vehicle_model, vehicle_number) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [customerId, phone, name, branchId, vehicle_make, vehicle_plate || null]
      });
    }

    // 3. Create Transaction
    const transactionId = uuidv4();
    const assignee = assigned_to || null;
    
    batchStatements.push({
      sql: `INSERT INTO transactions (id, customer_id, branch_id, staff_id, total_amount, points_awarded, status, vehicle_model, vehicle_number)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      args: [transactionId, customerId, branchId, assignee, service.price, service.points_earned, vehicle_make, vehicle_plate || null]
    });

    // 4. Create Transaction Service mapping
    const tsId = uuidv4();
    batchStatements.push({
      sql: `INSERT INTO transaction_services (id, transaction_id, service_id, price_at_time, points_at_time)
            VALUES (?, ?, ?, ?, ?)`,
      args: [tsId, transactionId, service_id, service.price, service.points_earned]
    });

    await db.batch(batchStatements, "write");

    return NextResponse.json({ success: true, transaction_id: transactionId });
  } catch (error) {
    console.error("Error creating new work:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = (session.user as any).branch_id;

  try {
    const result = await db.execute({
      sql: `SELECT 
              t.id, 
              t.status, 
              t.created_at,
              t.claimed_at,
              t.finished_at,
              c.vehicle_model,
              c.vehicle_number,
              c.name as customer_name,
              u.name as assigned_staff_name,
              u.id as assigned_staff_id,
              (SELECT s.name 
               FROM transaction_services ts 
               JOIN services s ON ts.service_id = s.id 
               WHERE ts.transaction_id = t.id 
               LIMIT 1) as service_name
            FROM transactions t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.staff_id = u.id
            WHERE t.branch_id = ? AND t.status != 'finished'
            ORDER BY t.created_at ASC`,
      args: [branchId],
    });

    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).branch_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userBranchId = (session.user as any).branch_id;
  const userRole = (session.user as any).role;

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    // 1. Fetch transaction to verify branch, current assignment, and points data
    const result = await db.execute({
      sql: `SELECT branch_id, staff_id, status, customer_id, points_awarded FROM transactions WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const transaction = result.rows[0];

    // Security Check 1: Branch verification
    if (transaction.branch_id !== userBranchId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    // Security Check 3: Ownership strict enforcement
    const isUnclaimed = transaction.staff_id === null;
    const isOwner = transaction.staff_id === userId;
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';

    if (!isUnclaimed && !isOwner && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Job is claimed by another staff member" }, { status: 403 });
    }

    // Determine staff_id to set. Implicit claim on first touch.
    const newStaffId = isUnclaimed ? userId : transaction.staff_id;
    const isClaimingNow = (isUnclaimed && newStaffId === userId) || (transaction.status === 'pending' && status === 'in_progress');
    const isFinishingNow = status === 'finished' && transaction.status !== 'finished';

    // Execute update
    const batchStatements = [];

    let sql = `UPDATE transactions SET status = ?, staff_id = ?`;
    const args: any[] = [status, newStaffId];

    if (isClaimingNow) {
      sql += `, claimed_at = CURRENT_TIMESTAMP`;
    }
    if (isFinishingNow) {
      sql += `, finished_at = CURRENT_TIMESTAMP`;
    }

    sql += ` WHERE id = ?`;
    args.push(id);
    
    batchStatements.push({ sql, args });

    if (isFinishingNow && transaction.points_awarded > 0) {
      batchStatements.push({
        sql: `UPDATE customers SET points_balance = points_balance + ? WHERE id = ?`,
        args: [transaction.points_awarded, transaction.customer_id]
      });
      // Add ledger entry
      batchStatements.push({
        sql: `INSERT INTO loyalty_points_ledger (id, customer_id, type, points, related_transaction_id) VALUES (?, ?, 'earned', ?, ?)`,
        args: [uuidv4(), transaction.customer_id, transaction.points_awarded, id]
      });
    }

    if (batchStatements.length > 1) {
      await db.batch(batchStatements, "write");
    } else {
      await db.execute(batchStatements[0]);
    }

    return NextResponse.json({ success: true, staff_id: newStaffId });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
