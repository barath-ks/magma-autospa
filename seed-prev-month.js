const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');

const db = createClient({ url: 'file:local.db' });

async function seed() {
  const branchId = 'branch-1';
  
  // Get staff
  const staffRes = await db.execute({
    sql: "SELECT id FROM users WHERE branch_id = ? AND role = 'staff' LIMIT 1",
    args: [branchId]
  });
  if (!staffRes.rows.length) return console.error('No staff found');
  const staffId = staffRes.rows[0].id;
  
  // Get customer
  const custRes = await db.execute({
    sql: "SELECT id, vehicle_model, vehicle_number FROM customers WHERE branch_id = ? LIMIT 1",
    args: [branchId]
  });
  if (!custRes.rows.length) return console.error('No customer found');
  const customer = custRes.rows[0];
  
  // Get a service
  const serviceRes = await db.execute("SELECT id, name, price, points_earned FROM services LIMIT 1");
  if (!serviceRes.rows.length) return console.error('No service found');
  const service = serviceRes.rows[0];

  const targetRevenue = 2000;
  const numTransactions = 4;
  const amountPerTx = targetRevenue / numTransactions;

  for (let i = 0; i < numTransactions; i++) {
    const txId = uuidv4();
    const dateStr = `2026-06-15 10:0${i}:00`;
    
    await db.execute({
      sql: `INSERT INTO transactions (id, customer_id, branch_id, staff_id, status, total_amount, points_awarded, created_at, vehicle_model, vehicle_number)
            VALUES (?, ?, ?, ?, 'finished', ?, ?, ?, ?, ?)`,
      args: [txId, customer.id, branchId, staffId, amountPerTx, service.points_earned, dateStr, customer.vehicle_model || 'Test Car', customer.vehicle_number || 'TEST-123']
    });
    
    await db.execute({
      sql: `INSERT INTO transaction_services (id, transaction_id, service_id, price_at_time, points_at_time)
            VALUES (?, ?, ?, ?, ?)`,
      args: [uuidv4(), txId, service.id, amountPerTx, service.points_earned]
    });
  }
  
  console.log('Successfully inserted seed data for June 2026!');
}

seed().catch(console.error);
