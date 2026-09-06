export const SCHEMA_SQL = `
-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  branch_code TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_password TEXT,
  must_change_password BOOLEAN DEFAULT 1,
  location TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('staff', 'manager', 'admin')) NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  branch_id TEXT,
  must_change_password BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Password History Table
CREATE TABLE IF NOT EXISTS password_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  points_balance INTEGER DEFAULT 0,
  branch_id TEXT NOT NULL,
  vehicle_number TEXT,
  vehicle_model TEXT,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  vehicle_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT CHECK(vehicle_type IN ('sedan', 'suv', 'hatchback', 'xuv', 'truck', 'van', 'bike', 'other')) NOT NULL,
  vehicle_model TEXT,
  vehicle_make TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER,
  category TEXT,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Offers Table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT DEFAULT 'reward',
  discount_value REAL,
  points_required INTEGER DEFAULT 0,
  min_spend REAL DEFAULT 0,
  start_date DATETIME,
  end_date DATETIME,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  staff_id TEXT,
  total_amount REAL NOT NULL,
  points_awarded INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'finished')) DEFAULT 'pending',
  payment_method TEXT CHECK(payment_method IN ('cash', 'upi', 'card')) DEFAULT 'cash',
  vehicle_id TEXT,
  vehicle_number TEXT,
  vehicle_model TEXT,
  claimed_at DATETIME,
  finished_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

-- Transaction Items (Services) Table
CREATE TABLE IF NOT EXISTS transaction_services (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  price_at_time REAL NOT NULL,
  points_at_time INTEGER NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);

-- Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- Profile Change Requests Table
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  field_type TEXT CHECK(field_type IN ('login_id', 'name')) NOT NULL,
  current_value TEXT NOT NULL,
  requested_value TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by TEXT,
  reviewed_at DATETIME,
  reviewer_note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT CHECK(channel IN ('phone', 'email')),
  code_hash TEXT NOT NULL,
  purpose TEXT DEFAULT 'password_reset',
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Customer OTP Codes Table
CREATE TABLE IF NOT EXISTS customer_otp_codes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  channel TEXT CHECK(channel IN ('phone', 'email')),
  code_hash TEXT NOT NULL,
  purpose TEXT DEFAULT 'redemption',
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Redemptions Table
CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  staff_id TEXT,
  offer_id TEXT NOT NULL,
  points_redeemed INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT
);

-- Branch Expenses Table
CREATE TABLE IF NOT EXISTS branch_expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  entered_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Loyalty Points Ledger Table
CREATE TABLE IF NOT EXISTS loyalty_points_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT CHECK(type IN ('earned', 'redeemed')) NOT NULL,
  points INTEGER NOT NULL,
  related_transaction_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Service Offers Table
CREATE TABLE IF NOT EXISTS service_offers (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  offer_price REAL NOT NULL,
  branch_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Combos Table
CREATE TABLE IF NOT EXISTS combos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  bundle_price REAL NOT NULL,
  start_date DATETIME,
  end_date DATETIME,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Combo Services Join Table
CREATE TABLE IF NOT EXISTS combo_services (
  combo_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (combo_id, service_id),
  FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);
`;
