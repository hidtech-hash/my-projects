# BillingPro v1.0.0

## Windows Desktop Billing Software for Small Retail Shops

A professional, offline-first billing application designed for photocopy shops, CSC centers, grocery stores, stationery shops, and service centers. Works completely offline with a local SQLite database.

---

## Screenshots & Features

### Modern Dashboard
- Real-time sales overview
- Today's statistics with color-coded cards
- Quick action buttons for fast workflow

### Fast Billing Interface
- Keyboard-friendly item entry
- Auto-calculation of amounts
- Dynamic UPI QR code generation
- One-click save and print

### Bill History & Search
- Search by bill number, date, or mobile
- View detailed bill information
- Reprint any old bill instantly

### Comprehensive Reports
- Daily, Date Range, Monthly reports
- Item-wise and Operator-wise analytics
- Export to PDF and Excel

### UPI QR Code Payment
- Dynamic QR with exact bill amount
- Compatible with GPay, PhonePe, Paytm, BHIM
- QR appears on printed receipt

---

## Quick Start

### For End Users (Pre-built)

1. Download `BillingPro-v1.0.0.zip`
2. Extract to a folder (e.g., `C:\BillingPro`)
3. Double-click `BillingPro.exe`
4. Login with default credentials:
   - **Admin:** `admin` / `admin123`
   - **Operator:** `operator` / `operator123`
5. Go to **Settings** → configure your shop details and UPI ID
6. Start billing!

### For Developers (Source Code)

```bash
# 1. Clone or download source code
cd BillingPro

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run application
python main.py
```

### Build Executable

```bash
# Run the build script (Windows)
build.bat

# Or manually:
pyinstaller --clean BillingPro.spec
```

---

## Complete Feature List

### Billing
- Auto bill number: `BILL-YYYYMMDD-XXXX`
- Item entry with quantity, rate, auto-amount
- Discount support (fixed amount)
- Multiple payment modes: Cash, Card, UPI, Mixed
- Balance calculation
- Optional customer name and mobile

### UPI QR Code
- Dynamic amount QR generation
- Official UPI URI format
- Compatible with all UPI apps
- QR on printed receipt

### Printing
- 58mm thermal printer (ESC/POS)
- A4 PDF invoice generation
- Professional receipt formatting
- Windows printer support
- Test print functionality

### Dashboard
- Today's sales, bills, collection
- Average bill value
- Auto-refresh every 30 seconds
- Quick action buttons

### Search & History
- Search by bill number
- Search by date range
- Search by mobile number
- View bill details
- Reprint old bills
- Cancel bills (admin)

### Reports (5 Types)
- Daily Report
- Date Range Report
- Monthly Report
- Item Wise Report
- Operator Wise Report
- PDF Export
- Excel Export

### Settings
- Shop name, address, contact
- GST number
- Logo upload
- UPI ID
- Footer message
- Printer selection

### Backup & Restore
- One-click backup
- One-click restore
- Automatic daily backup
- 30-day retention

### Security
- Admin & Operator roles
- bcrypt password hashing
- Activity logging

### UI/UX
- Modern dark sidebar + light content
- Large touch-friendly buttons
- Keyboard shortcuts (F2, F3, F5, F12)
- Fast billing workflow

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F2 | Save & Print Bill |
| F3 | Save Bill Only |
| F5 | Reset Form |
| F12 | Add Item |
| Enter | Next field / Add item |
| Tab | Navigate fields |
| Esc | Cancel operation |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| GUI Framework | PySide6 (Qt6) |
| Database | SQLite3 (offline) |
| QR Generation | qrcode + Pillow |
| Thermal Printing | python-escpos |
| PDF Reports | ReportLab |
| Excel Export | openpyxl |
| Security | bcrypt |
| Packaging | PyInstaller |

---

## System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 200 MB minimum, 500 MB recommended
- **Display:** 1366×768 minimum, 1920×1080 recommended
- **Python:** 3.9+ (for development only)

---

## Thermal Printer Setup

1. Connect printer via USB
2. Download [Zadig](https://zadig.akeo.ie/)
3. Open Zadig → Options → List All Devices
4. Select your printer → Replace driver with **WinUSB**
5. Click **Install Driver**
6. In BillingPro: Settings → Printer → Test Print

**Common Printer IDs:**
| Model | Vendor ID | Product ID |
|-------|-----------|------------|
| POS-5890K | 0x0416 | 0x5011 |
| Epson TM-T88IV | 0x04b8 | 0x0202 |
| Zjiang ZJ-5890 | 0x0483 | 0x5743 |

---

## Project Structure

```
BillingPro/
├── main.py                    # Entry point
├── requirements.txt           # Dependencies
├── BillingPro.spec           # PyInstaller config
├── build.bat                  # Build script
├── src/
│   ├── config.py             # Configuration
│   ├── ui/                   # UI modules (7 widgets)
│   ├── database/             # Database manager
│   ├── printer/              # Print handlers
│   ├── reports/              # PDF/Excel export
│   └── utils/                # QR utilities
├── database/
│   └── schema.sql            # SQLite schema
├── assets/                   # Icons & logos
├── backups/                  # Auto backups
└── docs/                     # Documentation
```

---

## Documentation

- [Installation Guide](docs/INSTALLATION_GUIDE.md) - Detailed setup instructions
- [Features](docs/FEATURES.md) - Complete feature documentation
- [Quick Reference](docs/QUICK_REFERENCE.md) - Quick command card
- [Project Summary](docs/PROJECT_SUMMARY.md) - Full deliverables list

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator | operator123 |

**⚠️ Change default passwords after first login!**

---

## License

Proprietary Software. All rights reserved.

---

**BillingPro v1.0.0** - Empowering Small Businesses in India
Built with Python, PySide6, and SQLite

For support, see the docs folder or contact the development team.
