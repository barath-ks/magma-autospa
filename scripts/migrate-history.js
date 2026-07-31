const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(process.cwd(), 'local.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("Starting History Migration...");

  // 1. Alter transactions to add vehicle columns
  try {
    db.run("ALTER TABLE transactions ADD COLUMN vehicle_number TEXT", (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Error adding vehicle_number:", err.message);
    });
    db.run("ALTER TABLE transactions ADD COLUMN vehicle_model TEXT", (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Error adding vehicle_model:", err.message);
    });
    console.log("Added vehicle columns to transactions.");
  } catch (e) {
    console.log("Vehicle columns already exist or error occurred.");
  }

  // 2. Create loyalty ledger table
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_points_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('earned', 'redeemed')) NOT NULL,
      points INTEGER NOT NULL,
      related_transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error("Error creating ledger table:", err);
    else console.log("Created loyalty_points_ledger table.");
  });

  // 3. Backfill vehicles onto transactions
  db.run(`
    UPDATE transactions
    SET 
      vehicle_model = (SELECT vehicle_model FROM customers WHERE customers.id = transactions.customer_id),
      vehicle_number = (SELECT vehicle_number FROM customers WHERE customers.id = transactions.customer_id)
    WHERE vehicle_model IS NULL AND vehicle_number IS NULL
  `, function(err) {
    if (err) console.error("Error backfilling vehicles:", err);
    else console.log(`Backfilled vehicles for ${this.changes} transactions.`);
  });

  // 4. Backfill ledger from finished transactions
  db.all(`SELECT id, customer_id, points_awarded, finished_at FROM transactions WHERE status = 'finished' AND points_awarded > 0`, (err, rows) => {
    if (err) {
      console.error("Error fetching transactions for ledger:", err);
      return;
    }
    
    if (rows.length === 0) {
      console.log("No finished transactions to backfill ledger.");
      return;
    }

    const stmt = db.prepare("INSERT OR IGNORE INTO loyalty_points_ledger (id, customer_id, type, points, related_transaction_id, created_at) VALUES (?, ?, 'earned', ?, ?, ?)");
    let count = 0;
    rows.forEach(row => {
      const ledgerId = uuidv4();
      stmt.run(ledgerId, row.customer_id, row.points_awarded, row.id, row.finished_at || new Date().toISOString(), (err) => {
        if (err) console.error(err);
      });
      count++;
    });
    stmt.finalize();
    console.log(`Backfilled ${count} earned points ledger entries.`);
  });

  // 5. Backfill ledger from redemptions
  db.all(`SELECT id, customer_id, points_redeemed, created_at FROM redemptions`, (err, rows) => {
    if (err) {
      console.error("Error fetching redemptions for ledger:", err);
      return;
    }

    if (rows.length === 0) {
      console.log("No redemptions to backfill ledger.");
      return;
    }

    const stmt = db.prepare("INSERT OR IGNORE INTO loyalty_points_ledger (id, customer_id, type, points, related_transaction_id, created_at) VALUES (?, ?, 'redeemed', ?, NULL, ?)");
    let count = 0;
    rows.forEach(row => {
      const ledgerId = uuidv4();
      stmt.run(ledgerId, row.customer_id, row.points_redeemed, row.created_at, (err) => {
        if (err) console.error(err);
      });
      count++;
    });
    stmt.finalize();
    console.log(`Backfilled ${count} redeemed points ledger entries.`);
  });

  setTimeout(() => {
    db.close();
    console.log("Migration Complete.");
  }, 1000);
});
