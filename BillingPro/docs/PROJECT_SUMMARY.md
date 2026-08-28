# BillingPro - Complete Project Deliverables

## Project: Windows Desktop Billing Software (Offline-First)

---

## ALL SOURCE CODE FILES

### 1. Entry Point
- **main.py** - Application entry point with main window, sidebar navigation, and page routing

### 2. Configuration
- **src/config.py** - Central configuration (paths, colors, settings, directory management)

### 3. Database Layer
- **src/database/db_manager.py** - Complete SQLite database manager with:
  - Singleton pattern for connection management
  - Bill CRUD operations (create, read, search, cancel)
  - Dashboard statistics (today's sales, monthly stats)
  - Report queries (daily, range, monthly, item-wise, operator-wise)
  - User authentication with bcrypt
  - Shop settings management
  - Backup/restore functionality
  - Activity logging

### 4. UI Components
- **src/ui/login_window.py** - Frameless login dialog with drag support
- **src/ui/dashboard.py** - Sales overview with stat cards and quick actions
- **src/ui/billing_widget.py** - Core billing interface with:
  - Fast item entry (description → qty → rate → amount)
  - Real-time total calculation
  - Discount and balance calculation
  - UPI QR preview
  - Keyboard shortcuts (F2, F3, F5, F12)
- **src/ui/history_widget.py** - Bill search with filters and detail view
- **src/ui/reports_widget.py** - 5 report types with PDF/Excel export
- **src/ui/settings_widget.py** - Shop config, printer, users, backup settings
- **src/ui/backup_widget.py** - Backup list, create, restore, delete

### 5. Utilities
- **src/utils/qr_utils.py** - UPI QR code generation with:
  - Dynamic amount QR (upi://pay format)
  - Static QR support
  - Styled QR with rounded modules
  - Auto-cleanup of old QR files

### 6. Printer Support
- **src/printer/printer_manager.py** - Dual printer support:
  - **ThermalPrinter class** - ESC/POS 58mm printer with USB connection
  - **A4Printer class** - PDF invoice generation with ReportLab
  - Windows printer enumeration
  - Test page printing

### 7. Reports
- **src/reports/report_generator.py** - PDF and Excel export engine:
  - Professional PDF tables with styling
  - Excel with formatted headers and auto-width
  - Support for all report types

### 8. Database Schema
- **database/schema.sql** - Complete SQLite schema with:
  - 5 core tables (users, shop_settings, bills, bill_items, activity_log)
  - 6 indexes for performance
  - 4 database views for reports
  - Default data (admin/operator users, default settings)

---

## DOCUMENTATION

### 1. README.md
- Project overview and features
- Technology stack
- Installation instructions
- Default credentials
- Project structure diagram

### 2. docs/INSTALLATION_GUIDE.md
- System requirements
- Quick start for end users
- Developer setup (Python, venv, dependencies)
- Thermal printer setup with Zadig
- USB vendor/product ID lookup
- Common printer IDs table
- UPI QR configuration
- PyInstaller build instructions
- Troubleshooting guide
- Keyboard shortcuts reference

### 3. docs/FEATURES.md
- Complete feature summary
- Receipt format example
- Technical specifications
- Database schema details
- All keyboard shortcuts

---

## BUILD & DEPLOYMENT

### 1. requirements.txt
All Python dependencies with versions:
- PySide6 (GUI)
- qrcode + Pillow (QR generation)
- python-escpos + pyusb (thermal printing)
- reportlab (PDF reports)
- openpyxl (Excel export)
- bcrypt (password hashing)
- pyinstaller (executable packaging)

### 2. BillingPro.spec
PyInstaller specification file for:
- Single executable build
- Asset bundling (icons, logo, database schema)
- Hidden imports for all dependencies
- Windows-specific settings

### 3. build.bat
Windows batch script for:
- Virtual environment creation
- Dependency installation
- Executable building
- Automated build process

### 4. run.bat
Quick launch script for development

---

## FOLDER STRUCTURE

```
BillingPro/
├── main.py                          # Entry point
├── requirements.txt                 # Dependencies
├── BillingPro.spec                  # PyInstaller spec
├── build.bat                        # Build script
├── run.bat                          # Quick run
├── README.md                        # Project readme
│
├── src/                             # Source code
│   ├── __init__.py
│   ├── config.py                    # App configuration
│   ├── ui/                          # User interface
│   │   ├── __init__.py
│   │   ├── login_window.py          # Login dialog
│   │   ├── dashboard.py             # Dashboard
│   │   ├── billing_widget.py        # New bill creation
│   │   ├── history_widget.py        # Bill history/search
│   │   ├── reports_widget.py        # Reports & analytics
│   │   ├── settings_widget.py       # Settings & config
│   │   └── backup_widget.py         # Backup management
│   ├── database/                    # Database layer
│   │   ├── __init__.py
│   │   └── db_manager.py            # SQLite operations
│   ├── printer/                     # Printing support
│   │   ├── __init__.py
│   │   └── printer_manager.py       # Thermal + A4 printing
│   ├── reports/                     # Report generation
│   │   ├── __init__.py
│   │   └── report_generator.py      # PDF/Excel export
│   └── utils/                       # Utilities
│       ├── __init__.py
│       └── qr_utils.py              # UPI QR generation
│
├── database/                        # Database files
│   └── schema.sql                   # SQLite schema
│
├── assets/                          # Static assets
│   ├── icons/                       # App icons
│   └── logo/                        # Shop logos
│
├── backups/                         # Auto backups (auto-created)
│
├── docs/                            # Documentation
│   ├── INSTALLATION_GUIDE.md        # Setup guide
│   └── FEATURES.md                  # Feature summary
│
└── installer/                       # Installer files
```

---

## KEY FEATURES IMPLEMENTED

### Billing
✅ Auto bill number generation (BILL-YYYYMMDD-XXXX)
✅ Item entry with auto-calculation
✅ Discount support
✅ Multiple payment modes
✅ Balance calculation
✅ Customer details (optional)

### UPI QR Code
✅ Dynamic QR with bill amount
✅ Official UPI URI format
✅ Compatible with all UPI apps
✅ QR preview in billing screen
✅ QR on printed receipt

### Printing
✅ 58mm thermal printer (ESC/POS)
✅ A4 PDF invoice generation
✅ Professional receipt formatting
✅ Windows printer support
✅ Test print functionality

### Dashboard
✅ Today's sales stats
✅ Bill count, collection, average
✅ Auto-refresh (30s interval)
✅ Quick action buttons

### Search & History
✅ Search by bill number
✅ Search by date range
✅ Search by mobile number
✅ View bill details
✅ Reprint old bills
✅ Cancel bills (admin)

### Reports (5 Types)
✅ Daily Report
✅ Date Range Report
✅ Monthly Report
✅ Item Wise Report
✅ Operator Wise Report
✅ PDF Export
✅ Excel Export

### Settings
✅ Shop name, address, contact
✅ GST number
✅ Logo upload
✅ UPI ID
✅ Footer message
✅ Printer selection

### Backup & Restore
✅ One-click backup
✅ One-click restore
✅ Automatic daily backup
✅ Backup list with details
✅ Safety backup before restore

### Security
✅ Admin login
✅ Operator login
✅ bcrypt password hashing
✅ Activity logging
✅ Role-based access

### UI/UX
✅ Modern dark sidebar + light content
✅ Card-based layout
✅ Large touch-friendly buttons
✅ Keyboard shortcuts (F2, F3, F5, F12)
✅ Fast billing workflow
✅ Responsive design

---

## TECHNICAL HIGHLIGHTS

1. **Offline-First Architecture** - SQLite database, no server needed
2. **Singleton Database Manager** - Thread-safe connection pooling
3. **Context Manager** - Automatic commit/rollback
4. **Database Views** - Pre-computed reports for performance
5. **Auto-Backup** - Scheduled with cleanup (30 days retention)
6. **UPI QR Standard** - Official NPCI UPI URI format
7. **Dual Printing** - ESC/POS thermal + ReportLab PDF
8. **Modular UI** - Separate widgets per feature
9. **Signal-Slot Pattern** - PySide6 event handling
10. **Password Security** - bcrypt with salt

---

## DEFAULT LOGIN CREDENTIALS

| Role | Username | Password | Permissions |
|------|----------|----------|-------------|
| Admin | admin | admin123 | Full access |
| Operator | operator | operator123 | Billing only |

**⚠️ IMPORTANT: Change default passwords after first login!**

---

## NEXT STEPS FOR DEPLOYMENT

1. **Install Python 3.9+** on Windows
2. **Run build.bat** to create executable
3. **Test on target machine** with thermal printer
4. **Configure shop settings** (name, UPI, logo)
5. **Train operators** on keyboard shortcuts
6. **Set up auto-backup** location
7. **Distribute** the dist/BillingPro.exe folder

---

**BillingPro v1.0.0**
Professional Billing Software for Small Retail Shops
Built with Python, PySide6, and SQLite
