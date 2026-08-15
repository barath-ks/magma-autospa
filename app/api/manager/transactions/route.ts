import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "manager" && (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staffBranchId = (session.user as any).branch_id;

  try {
    const body = await request.json();
    const { customer_id, service_ids, assigned_to, vehicle_id } = body;

    // 1. Validate inputs
    if (!customer_id || !vehicle_id || !Array.isArray(service_ids) || service_ids.length === 0) {
      return NextResponse.json({ error: "customer_id, vehicle_id, and a non-empty service_ids array are required" }, { status: 400 });
    }

    // 2. Validate customer branch and vehicle
    const customerRes = await db.execute({
      sql: `
        SELECT c.branch_id, v.vehicle_number, v.vehicle_model
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.customer_id AND v.id = ?
        WHERE c.id = ?
      `,
      args: [vehicle_id, customer_id],
    });

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    if (!customerRes.rows[0].vehicle_number) {
       return NextResponse.json({ error: "Vehicle not found or does not belong to this customer" }, { status: 400 });
    }

    if (customerRes.rows[0].branch_id !== staffBranchId) {
      return NextResponse.json({ error: "Forbidden: Customer belongs to a different branch" }, { status: 403 });
    }

    // 2b. Validate assigned_to branch if provided
    let finalAssignee = null;
    if (assigned_to) {
      const staffRes = await db.execute({
        sql: `SELECT branch_id FROM users WHERE id = ? AND role IN ('staff', 'manager', 'admin')`,
        args: [assigned_to]
      });
      if (staffRes.rows.length === 0) {
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
      if (staffRes.rows[0].branch_id !== staffBranchId) {
        return NextResponse.json({ error: "Forbidden: Cannot assign to staff outside your branch" }, { status: 403 });
      }
      finalAssignee = assigned_to;
    }

    // 3. Fetch all requested services in a single query
    const placeholders = service_ids.map(() => '?').join(',');
    const servicesRes = await db.execute({
      sql: `SELECT id, name, price, points_earned, is_active FROM services WHERE id IN (${placeholders})`,
      args: [...service_ids]
    });

    const serviceMap = new Map();
    for (const s of servicesRes.rows) {
      serviceMap.set(s.id, s);
    }

    // 4. Validate all services exist and are active, and calculate total
    let totalAmount = 0;
    let projectedPoints = 0;
    const servicesToInsert = [];

    for (const id of service_ids) {
      const s = serviceMap.get(id);
      if (!s) {
        return NextResponse.json({ error: `Service ID ${id} not found` }, { status: 400 });
      }
      if (!s.is_active) {
        return NextResponse.json({ error: `Service '${s.name}' is no longer active` }, { status: 400 });
      }

      const price = Number(s.price);
      totalAmount += price;
      projectedPoints += Number(s.points_earned) || 0;
      
      servicesToInsert.push({
        id: uuidv4(),
        service_id: id,
        price_at_time: price,
        points_at_time: Number(s.points_earned) || 0
      });
    }

    // 5. Calculate Points Awarded
    const pointsAwarded = projectedPoints;
    const transactionId = uuidv4();

    // 6. DB Batch Insert
    const batchStatements = [];

    // Insert Transaction
    batchStatements.push({
      sql: `INSERT INTO transactions (id, customer_id, branch_id, staff_id, total_amount, points_awarded, status, vehicle_id, vehicle_model, vehicle_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [transactionId, customer_id, staffBranchId, finalAssignee, totalAmount, pointsAwarded, vehicle_id, customerRes.rows[0].vehicle_model, customerRes.rows[0].vehicle_number],
    });

    // Insert Transaction Services
    for (const ts of servicesToInsert) {
      batchStatements.push({
        sql: `INSERT INTO transaction_services (id, transaction_id, service_id, price_at_time, points_at_time)
              VALUES (?, ?, ?, ?, ?)`,
        args: [ts.id, transactionId, ts.service_id, ts.price_at_time, ts.points_at_time],
      });
    }

    await db.batch(batchStatements, "write");

    return NextResponse.json({ 
      success: true, 
      id: transactionId, 
      total_amount: totalAmount, 
      points_awarded: pointsAwarded 
    });

  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
