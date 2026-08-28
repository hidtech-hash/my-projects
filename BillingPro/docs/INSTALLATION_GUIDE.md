# BillingPro - Installation & Setup Guide

## Windows Desktop Billing Software
**Version:** 1.0.0 | **Platform:** Windows 10/11 (64-bit)

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Quick Start (For Users)](#quick-start-for-users)
3. [Developer Setup](#developer-setup)
4. [Thermal Printer Setup](#thermal-printer-setup)
5. [UPI QR Code Configuration](#upi-qr-code-configuration)
6. [Building the Executable](#building-the-executable)
7. [Troubleshooting](#troubleshooting)
8. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## System Requirements

### Minimum Requirements
- **OS:** Windows 10 (64-bit) or Windows 11
- **RAM:** 4 GB
- **Storage:** 200 MB free space
- **Display:** 1366 x 768 resolution
- **Python:** 3.9+ (for development only)

### Recommended
- **OS:** Windows 11 (64-bit)
- **RAM:** 8 GB
- **Storage:** 500 MB free space
- **Display:** 1920 x 1080 resolution
- **Printer:** 58mm Thermal Printer (ESC/POS compatible)

---

## Quick Start (For Users)

### Step 1: Download & Extract
1. Download `BillingPro-v1.0.0.zip` from the release page
2. Extract to a folder (e.g., `C:\BillingPro`)
3. Do NOT move the folder after first run (database path is relative)

### Step 2: First Run
1. Double-click `BillingPro.exe`
2. Login with default credentials:
   - **Admin:** `admin` / `admin123`
   - **Operator:** `operator` / `operator123`
3. Go to **Settings** → configure your shop details
4. Enter your **UPI ID** for QR code generation

### Step 3: Start Billing
1. Click **New Bill** or press `F2`
2. Enter item details → Quantity → Rate
3. Press `Enter` or click **Add**
4. Set discount (if any) and amount received
5. Click **Save & Print** or press `F2`

---

## Developer Setup

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Git (optional)

### Step 1: Clone/Download Source
```bash
cd C:\Projects
git clone <repository-url>
cd BillingPro
```

### Step 2: Create Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python main.py
```

---

## Thermal Printer Setup

### Finding Your Printer's USB IDs

#### Method 1: Using PowerShell (Windows)
```powershell
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match '^USB' } | Format-List
```
Look for your printer and note the **VID** (Vendor ID) and **PID** (Product ID).

#### Method 2: Using Python
```python
import usb.core
for dev in usb.core.find(find_all=True):
    print(f"Vendor: {hex(dev.idVendor)}, Product: {hex(dev.idProduct)}")
```

### Common Thermal Printer IDs
| Printer Model | Vendor ID | Product ID |
|--------------|-----------|------------|
| Epson TM-T88IV | 0x04b8 | 0x0202 |
| POS-5890K | 0x0416 | 0x5011 |
| Bixolon SRP-350 | 0x1504 | 0x0006 |
| Zjiang ZJ-5890 | 0x0483 | 0x5743 |

### Windows-Specific Setup (Zadig)

**Important:** On Windows, python-escpos requires the **libusb** backend.

1. Download **Zadig** from https://zadig.akeo.ie/
2. Connect your thermal printer
3. Open Zadig → Options → List All Devices
4. Select your printer from the dropdown
5. Replace driver with **WinUSB** (or libusbK)
6. Click **Install Driver**
7. Copy `libusb-1.0.dll` to your Python directory or System32

### Configuring in BillingPro
1. Go to **Settings** → **Printer**
2. Select your default printer from the dropdown
3. For thermal printer, the app auto-detects if connected
4. Click **Test Print** to verify

### Receipt Format (58mm)
```
SHOP NAME
Address Line 1
Contact: 9876543210

------------------------------
Bill No: BILL-20260101-0001
Date: 01-01-2026 14:30:00
Customer: John Doe
------------------------------
Particular          Qty   Amt
Photo Copy            5   10.00
Printout              2   20.00
Lamination            1   30.00
------------------------------
Sub Total:            ₹60.00
Discount:             ₹0.00
TOTAL:                ₹60.00
Received:             ₹60.00
Balance:              ₹0.00
Mode: Cash
------------------------------

Scan & Pay
[QR CODE IMAGE]

UPI ID: shopname@upi

Thank You! Visit Again
Operator: Admin
```

---

## UPI QR Code Configuration

### Setting Up UPI Payment
1. Go to **Settings** → **Shop Settings**
2. Enter your **UPI ID** (e.g., `yourshop@upi`)
3. The QR code will automatically generate with the bill amount

### Supported UPI Apps
- Google Pay
- PhonePe
- Paytm
- BHIM
- Any UPI-compatible app

### QR Code Format
The generated QR follows the official UPI URI format:
```
upi://pay?pa=shopname@upi&pn=ShopName&am=150.00&tn=Bill%20Payment&cu=INR
```

---

## Building the Executable

### Using PyInstaller

```bash
# Activate virtual environment
venv\Scripts\activate

# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller --clean BillingPro.spec

# OR build with one-file option
pyinstaller --onefile --windowed --icon=assets\icons\app.ico main.py
```

### Build Output
- Executable: `dist\BillingPro.exe`
- All dependencies are bundled
- Database and assets are included

### Creating Installer (Optional)
Use **Inno Setup** or **NSIS** to create a professional Windows installer.

---

## Troubleshooting

### Issue: "No backend available" (Thermal Printer)
**Solution:**
1. Install Zadig and replace driver with WinUSB
2. Ensure `libusb-1.0.dll` is in System32 or Python directory
3. Run as Administrator

### Issue: "Database locked" or "Permission denied"
**Solution:**
1. Close all instances of BillingPro
2. Check if database file is read-only
3. Run as Administrator if installed in Program Files

### Issue: QR Code not generating
**Solution:**
1. Check if UPI ID is set in Settings
2. Ensure `qrcode` and `Pillow` are installed
3. Check temp directory permissions

### Issue: Print not working
**Solution:**
1. Check printer connection
2. Verify printer is set as default in Windows
3. For thermal: check USB cable and power
4. Try printing a test page from Settings

### Issue: App won't start
**Solution:**
1. Check Python version (3.9+)
2. Reinstall requirements: `pip install -r requirements.txt --force-reinstall`
3. Check Windows Event Viewer for errors

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F2` | Save & Print Bill |
| `F3` | Save Bill Only |
| `F5` | Reset Bill Form |
| `F12` | Add Item to Bill |
| `Enter` | Move to next field / Add item |
| `Tab` | Navigate between fields |
| `Ctrl + S` | Save current bill |
| `Ctrl + P` | Print last bill |
| `Ctrl + F` | Search bills |
| `Esc` | Cancel current operation |

---

## Database Schema

The application uses **SQLite** as the local database. Key tables:

- **users** - Authentication & roles
- **bills** - Bill headers
- **bill_items** - Bill line items
- **shop_settings** - Shop configuration
- **activity_log** - Audit trail

### Database Location
```
BillingPro/
├── database/
│   ├── billingpro.db       # Main database
│   └── schema.sql          # Schema definition
├── backups/                # Auto backups
│   └── billingpro_backup_*.db
```

---

## Support & Updates

For support, updates, and feature requests:
- Check the project repository
- Review this documentation
- Contact the development team

---

**BillingPro v1.0.0** - Professional Billing Software for Retail Shops
