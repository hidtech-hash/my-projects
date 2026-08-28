"""
BillingPro - Database Manager
=============================
Handles all database operations using SQLite.
"""

import sqlite3
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import contextmanager
from typing import List, Dict, Optional, Tuple, Any

from src.config import AppConfig


class DatabaseManager:
    """Central database manager for BillingPro."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.db_path = str(AppConfig.DB_PATH)
        self._init_database()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _init_database(self):
        """Initialize database with schema if it doesn't exist."""
        if not os.path.exists(self.db_path):
            with self.get_connection() as conn:
                with open(AppConfig.SCHEMA_PATH, 'r') as f:
                    conn.executescript(f.read())
            print(f"Database initialized at {self.db_path}")

    # ==================== BILL OPERATIONS ====================

    def get_next_bill_number(self) -> str:
        """Generate next bill number (format: BILL-YYYYMMDD-XXXX)."""
        today = datetime.now().strftime("%Y%m%d")
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT bill_number FROM bills WHERE bill_number LIKE ? ORDER BY id DESC LIMIT 1",
                (f"BILL-{today}-%",)
            )
            result = cursor.fetchone()

            if result:
                last_num = int(result['bill_number'].split('-')[-1])
                next_num = last_num + 1
            else:
                next_num = 1

            return f"BILL-{today}-{next_num:04d}"

    def create_bill(self, bill_data: Dict) -> int:
        """Create a new bill and return its ID."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """INSERT INTO bills (
                    bill_number, bill_date, bill_time, customer_name, customer_mobile,
                    customer_email, sub_total, discount_amount, discount_percent,
                    grand_total, amount_received, balance_amount, payment_mode,
                    notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    bill_data['bill_number'],
                    bill_data['bill_date'],
                    bill_data['bill_time'],
                    bill_data.get('customer_name', ''),
                    bill_data.get('customer_mobile', ''),
                    bill_data.get('customer_email', ''),
                    bill_data['sub_total'],
                    bill_data.get('discount_amount', 0),
                    bill_data.get('discount_percent', 0),
                    bill_data['grand_total'],
                    bill_data.get('amount_received', 0),
                    bill_data.get('balance_amount', 0),
                    bill_data.get('payment_mode', 'Cash'),
                    bill_data.get('notes', ''),
                    bill_data['created_by']
                )
            )
            bill_id = cursor.lastrowid

            for item in bill_data.get('items', []):
                conn.execute(
                    """INSERT INTO bill_items (
                        bill_id, item_description, quantity, rate, amount,
                        hsn_code, gst_percent, gst_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        bill_id,
                        item['description'],
                        item['quantity'],
                        item['rate'],
                        item['amount'],
                        item.get('hsn_code', ''),
                        item.get('gst_percent', 0),
                        item.get('gst_amount', 0)
                    )
                )

            return bill_id

    def get_bill_by_id(self, bill_id: int) -> Optional[Dict]:
        """Get bill details by ID."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """SELECT b.*, u.full_name as operator_name
                FROM bills b
                LEFT JOIN users u ON b.created_by = u.id
                WHERE b.id = ? AND b.is_cancelled = 0""",
                (bill_id,)
            )
            bill = cursor.fetchone()

            if not bill:
                return None

            items_cursor = conn.execute(
                "SELECT * FROM bill_items WHERE bill_id = ?",
                (bill_id,)
            )
            items = [dict(row) for row in items_cursor.fetchall()]

            result = dict(bill)
            result['items'] = items
            return result

    def get_bill_by_number(self, bill_number: str) -> Optional[Dict]:
        """Get bill by bill number."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT id FROM bills WHERE bill_number = ? AND is_cancelled = 0",
                (bill_number,)
            )
            result = cursor.fetchone()
            if result:
                return self.get_bill_by_id(result['id'])
            return None

    def search_bills(self, search_term: str = None, date_from: str = None,
                     date_to: str = None, mobile: str = None) -> List[Dict]:
        """Search bills with filters."""
        query = """SELECT b.*, u.full_name as operator_name
            FROM bills b
            LEFT JOIN users u ON b.created_by = u.id
            WHERE b.is_cancelled = 0"""
        params = []

        if search_term:
            query += " AND (b.bill_number LIKE ? OR b.customer_name LIKE ?)"
            params.extend([f"%{search_term}%", f"%{search_term}%"])

        if date_from:
            query += " AND b.bill_date >= ?"
            params.append(date_from)

        if date_to:
            query += " AND b.bill_date <= ?"
            params.append(date_to)

        if mobile:
            query += " AND b.customer_mobile LIKE ?"
            params.append(f"%{mobile}%")

        query += " ORDER BY b.created_at DESC"

        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def cancel_bill(self, bill_id: int, reason: str, user_id: int) -> bool:
        """Cancel a bill (soft delete)."""
        with self.get_connection() as conn:
            conn.execute(
                """UPDATE bills 
                SET is_cancelled = 1, cancellation_reason = ?, updated_at = ?
                WHERE id = ?""",
                (reason, datetime.now().isoformat(), bill_id)
            )
            self._log_activity(user_id, "BILL_CANCEL",
                               f"Cancelled bill ID {bill_id}. Reason: {reason}")
            return True

    # ==================== DASHBOARD OPERATIONS ====================

    def get_today_stats(self) -> Dict:
        """Get today's sales statistics."""
        today = datetime.now().strftime("%Y-%m-%d")
        with self.get_connection() as conn:
            cursor = conn.execute(
                """SELECT 
                    COUNT(*) as total_bills,
                    COALESCE(SUM(grand_total), 0) as total_sales,
                    COALESCE(SUM(amount_received), 0) as total_collection,
                    COALESCE(AVG(grand_total), 0) as avg_bill_value
                FROM bills
                WHERE bill_date = ? AND is_cancelled = 0""",
                (today,)
            )
            return dict(cursor.fetchone())

    def get_monthly_stats(self, year: int = None, month: int = None) -> Dict:
        """Get monthly statistics."""
        if year is None:
            year = datetime.now().year
        if month is None:
            month = datetime.now().month

        month_str = f"{year}-{month:02d}"
        with self.get_connection() as conn:
            cursor = conn.execute(
                """SELECT 
                    COUNT(*) as total_bills,
                    COALESCE(SUM(grand_total), 0) as total_sales,
                    COALESCE(SUM(amount_received), 0) as total_collection
                FROM bills
                WHERE strftime('%Y-%m', bill_date) = ? AND is_cancelled = 0""",
                (month_str,)
            )
            return dict(cursor.fetchone())

    # ==================== REPORT OPERATIONS ====================

    def get_daily_report(self, date: str = None) -> Dict:
        """Get daily report."""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        with self.get_connection() as conn:
            summary = conn.execute(
                "SELECT * FROM v_daily_sales WHERE bill_date = ?",
                (date,)
            ).fetchone()

            bills = conn.execute(
                """SELECT b.*, u.full_name as operator_name
                FROM bills b
                LEFT JOIN users u ON b.created_by = u.id
                WHERE b.bill_date = ? AND b.is_cancelled = 0
                ORDER BY b.bill_time DESC""",
                (date,)
            ).fetchall()

            return {
                'summary': dict(summary) if summary else {},
                'bills': [dict(row) for row in bills]
            }

    def get_date_range_report(self, date_from: str, date_to: str) -> Dict:
        """Get date range report."""
        with self.get_connection() as conn:
            summary = conn.execute(
                """SELECT 
                    COUNT(*) as total_bills,
                    COALESCE(SUM(grand_total), 0) as total_sales,
                    COALESCE(SUM(amount_received), 0) as total_collection,
                    COALESCE(AVG(grand_total), 0) as avg_bill_value
                FROM bills
                WHERE bill_date BETWEEN ? AND ? AND is_cancelled = 0""",
                (date_from, date_to)
            ).fetchone()

            daily_breakdown = conn.execute(
                """SELECT * FROM v_daily_sales
                WHERE bill_date BETWEEN ? AND ?
                ORDER BY bill_date""",
                (date_from, date_to)
            ).fetchall()

            return {
                'summary': dict(summary),
                'daily_breakdown': [dict(row) for row in daily_breakdown]
            }

    def get_monthly_report(self, year: int = None) -> List[Dict]:
        """Get monthly report for a year."""
        if year is None:
            year = datetime.now().year

        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM v_monthly_sales WHERE month LIKE ? ORDER BY month",
                (f"{year}%",)
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_item_wise_report(self, date_from: str = None, date_to: str = None) -> List[Dict]:
        """Get item-wise sales report."""
        query = """SELECT 
                bi.item_description,
                SUM(bi.quantity) as total_quantity,
                SUM(bi.amount) as total_amount,
                COUNT(DISTINCT bi.bill_id) as times_sold
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            WHERE b.is_cancelled = 0"""
        params = []

        if date_from:
            query += " AND b.bill_date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND b.bill_date <= ?"
            params.append(date_to)

        query += " GROUP BY bi.item_description ORDER BY total_quantity DESC"

        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_operator_wise_report(self, date_from: str = None, date_to: str = None) -> List[Dict]:
        """Get operator-wise report."""
        query = """SELECT 
                u.full_name as operator_name,
                COUNT(*) as bills_created,
                COALESCE(SUM(b.grand_total), 0) as total_amount
            FROM bills b
            JOIN users u ON b.created_by = u.id
            WHERE b.is_cancelled = 0"""
        params = []

        if date_from:
            query += " AND b.bill_date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND b.bill_date <= ?"
            params.append(date_to)

        query += " GROUP BY u.full_name ORDER BY total_amount DESC"

        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    # ==================== SETTINGS OPERATIONS ====================

    def get_shop_settings(self) -> Dict:
        """Get shop settings."""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM shop_settings WHERE id = 1")
            result = cursor.fetchone()
            return dict(result) if result else {}

    def update_shop_settings(self, settings: Dict) -> bool:
        """Update shop settings."""
        with self.get_connection() as conn:
            conn.execute(
                """UPDATE shop_settings SET
                    shop_name = ?, address = ?, city = ?, state = ?,
                    pincode = ?, contact_number = ?, email = ?,
                    gst_number = ?, logo_path = ?, upi_id = ?,
                    footer_message = ?, printer_name = ?,
                    auto_backup = ?, backup_path = ?, updated_at = ?
                WHERE id = 1""",
                (
                    settings.get('shop_name', 'My Shop'),
                    settings.get('address', ''),
                    settings.get('city', ''),
                    settings.get('state', ''),
                    settings.get('pincode', ''),
                    settings.get('contact_number', ''),
                    settings.get('email', ''),
                    settings.get('gst_number', ''),
                    settings.get('logo_path', ''),
                    settings.get('upi_id', ''),
                    settings.get('footer_message', 'Thank You! Visit Again'),
                    settings.get('printer_name', ''),
                    settings.get('auto_backup', 1),
                    settings.get('backup_path', ''),
                    datetime.now().isoformat()
                )
            )
            return True

    # ==================== USER OPERATIONS ====================

    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user and return user data."""
        import bcrypt

        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM users WHERE username = ? AND is_active = 1",
                (username,)
            )
            user = cursor.fetchone()

            if user and bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
                conn.execute(
                    "UPDATE users SET last_login = ? WHERE id = ?",
                    (datetime.now().isoformat(), user['id'])
                )
                return dict(user)
            return None

    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID."""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            return dict(result) if result else None

    def create_user(self, username: str, password: str, full_name: str,
                    role: str, created_by: int) -> bool:
        """Create a new user."""
        import bcrypt

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        with self.get_connection() as conn:
            conn.execute(
                """INSERT INTO users (username, password_hash, full_name, role)
                VALUES (?, ?, ?, ?)""",
                (username, password_hash, full_name, role)
            )
            self._log_activity(created_by, "USER_CREATE",
                               f"Created user: {username} ({role})")
            return True

    # ==================== BACKUP OPERATIONS ====================

    def create_backup(self) -> str:
        """Create a database backup."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"billingpro_backup_{timestamp}.db"
        backup_path = AppConfig.BACKUP_DIR / backup_name

        shutil.copy2(self.db_path, backup_path)
        self._clean_old_backups()

        return str(backup_path)

    def restore_backup(self, backup_path: str) -> bool:
        """Restore database from backup."""
        if not os.path.exists(backup_path):
            return False

        safety_backup = AppConfig.BACKUP_DIR / f"safety_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(self.db_path, safety_backup)
        shutil.copy2(backup_path, self.db_path)
        return True

    def list_backups(self) -> List[Dict]:
        """List all available backups."""
        backups = []
        if AppConfig.BACKUP_DIR.exists():
            for file in sorted(AppConfig.BACKUP_DIR.glob("billingpro_backup_*.db"), reverse=True):
                stat = file.stat()
                backups.append({
                    'filename': file.name,
                    'path': str(file),
                    'size': stat.st_size,
                    'created': datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
        return backups

    def _clean_old_backups(self):
        """Remove old backups keeping only the last N."""
        backups = sorted(AppConfig.BACKUP_DIR.glob("billingpro_backup_*.db"))
        if len(backups) > AppConfig.MAX_BACKUP_FILES:
            for old_backup in backups[:-AppConfig.MAX_BACKUP_FILES]:
                old_backup.unlink()

    # ==================== ACTIVITY LOG ====================

    def _log_activity(self, user_id: int, action: str, description: str):
        """Log user activity."""
        with self.get_connection() as conn:
            conn.execute(
                """INSERT INTO activity_log (user_id, action, description)
                VALUES (?, ?, ?)""",
                (user_id, action, description)
            )

    def get_activity_log(self, limit: int = 100) -> List[Dict]:
        """Get recent activity log."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """SELECT a.*, u.full_name as user_name
                FROM activity_log a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.timestamp DESC
                LIMIT ?""",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]


# Global database instance
db = DatabaseManager()
