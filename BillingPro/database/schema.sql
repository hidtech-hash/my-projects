-- BillingPro Database Schema
-- SQLite Database for Windows Desktop Billing Software
-- Version: 1.0.0

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'operator')),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Shop settings table
CREATE TABLE IF NOT EXISTS shop_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    shop_name TEXT NOT NULL DEFAULT 'My Shop',
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    contact_number TEXT,
    email TEXT,
    gst_number TEXT,
    logo_path TEXT,
    upi_id TEXT,
    footer_message TEXT DEFAULT 'Thank You! Visit Again',
    printer_name TEXT,
    auto_backup INTEGER DEFAULT 1,
    backup_path TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT NOT NULL UNIQUE,
    bill_date DATE NOT NULL,
    bill_time TIME NOT NULL,
    customer_name TEXT,
    customer_mobile TEXT,
    customer_email TEXT,
    sub_total REAL NOT NULL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    amount_received REAL DEFAULT 0,
    balance_amount REAL DEFAULT 0,
    payment_mode TEXT DEFAULT 'Cash' CHECK(payment_mode IN ('Cash', 'Card', 'UPI', 'Mixed')),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_cancelled INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bill items table
CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    rate REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    hsn_code TEXT,
    gst_percent REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_mobile ON bills(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role) 
VALUES (1, 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I1W', 'Administrator', 'admin');

-- Insert default operator user (password: operator123)
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role) 
VALUES (2, 'operator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I1W', 'Operator', 'operator');

-- Insert default shop settings
INSERT OR IGNORE INTO shop_settings (id, shop_name, address, contact_number, footer_message) 
VALUES (1, 'My Shop', 'Shop Address', '0000000000', 'Thank You! Visit Again');

-- ============================================
-- VIEWS FOR REPORTS
-- ============================================

-- Daily sales summary view
CREATE VIEW IF NOT EXISTS v_daily_sales AS
SELECT 
    bill_date,
    COUNT(*) as total_bills,
    SUM(sub_total) as total_sub_total,
    SUM(discount_amount) as total_discount,
    SUM(grand_total) as total_sales,
    SUM(amount_received) as total_collection,
    AVG(grand_total) as avg_bill_value
FROM bills 
WHERE is_cancelled = 0
GROUP BY bill_date;

-- Monthly sales summary view
CREATE VIEW IF NOT EXISTS v_monthly_sales AS
SELECT 
    strftime('%Y-%m', bill_date) as month,
    COUNT(*) as total_bills,
    SUM(grand_total) as total_sales,
    SUM(amount_received) as total_collection
FROM bills 
WHERE is_cancelled = 0
GROUP BY strftime('%Y-%m', bill_date);

-- Top selling items view
CREATE VIEW IF NOT EXISTS v_top_items AS
SELECT 
    item_description,
    SUM(quantity) as total_quantity,
    SUM(amount) as total_amount,
    COUNT(DISTINCT bill_id) as times_sold
FROM bill_items bi
JOIN bills b ON bi.bill_id = b.id
WHERE b.is_cancelled = 0
GROUP BY item_description
ORDER BY total_quantity DESC;

-- Operator performance view
CREATE VIEW IF NOT EXISTS v_operator_performance AS
SELECT 
    u.full_name as operator_name,
    b.bill_date,
    COUNT(*) as bills_created,
    SUM(b.grand_total) as total_amount
FROM bills b
JOIN users u ON b.created_by = u.id
WHERE b.is_cancelled = 0
GROUP BY u.full_name, b.bill_date;
