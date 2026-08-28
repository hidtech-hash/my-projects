# BillingPro - Complete Feature Summary

## Application Overview
**BillingPro** is a professional Windows Desktop Billing Software designed for small retail shops, photocopy centers, CSC centers, grocery stores, stationery shops, and service centers. It operates completely offline with a local SQLite database.

---

## 1. BILLING MODULE

### Create New Bill
- **Bill Number:** Auto-generated format `BILL-YYYYMMDD-XXXX` (e.g., BILL-20260101-0001)
- **Date & Time:** Auto-captured from system
- **Customer Name:** Optional field
- **Mobile Number:** Optional field
- **Fast Entry:** Tab/Enter key navigation between fields

### Item Entry Table
- **Particular Description:** Free text entry
- **Quantity:** Decimal support (e.g., 1.5 kg, 2.5 hours)
- **Rate:** Per unit price
- **Amount:** Auto-calculated (Qty × Rate)
- **Add Item:** Press Enter or click Add button
- **Remove Item:** Select and remove any item

### Bill Summary
- **Sub Total:** Sum of all item amounts
- **Discount:** Optional fixed amount discount
- **Grand Total:** Sub Total - Discount
- **Amount Received:** Cash received from customer
- **Balance:** Auto-calculated (Received - Grand Total)
- **Payment Mode:** Cash, Card, UPI, Mixed

### Receipt Header (Customizable)
- Shop Name
- Address (multi-line)
- City, State, Pincode
- Contact Number
- Email
- GST Number (optional)
- Shop Logo (optional, uploaded in settings)

### Receipt Footer (Customizable)
- Thank You Message
- Operator Name (auto-filled)
- Date & Time of printing
- UPI QR Code (if configured)

---

## 2. UPI QR CODE INTEGRATION

### Dynamic QR Generation
- **UPI ID stored in Settings** (e.g., shopname@upi)
- **Dynamic Amount:** QR code amount matches bill total automatically
- **Official UPI Format:** `upi://pay?pa=shopname@upi&pn=ShopName&am=150.00&tn=Bill%20Payment&cu=INR`
- **Compatible Apps:** Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, any UPI app

### QR on Receipt
- QR code appears at bottom of printed receipt
- Labeled "Scan & Pay"
- UPI ID displayed below QR
- Amount auto-populated

---

## 3. PRINTING SUPPORT

### 58mm Thermal Printer (ESC/POS)
- **Professional alignment** with proper spacing
- **Auto paper width adjustment** (48 characters per line)
- **Clear fonts** with bold headers
- **QR Code at bottom** of receipt
- **Fast print** with minimal delay
- **Supported Printers:**
  - Epson TM-T88 series
  - POS-5890K / ZJ-5890
  - Bixolon SRP-350
  - Any ESC/POS compatible 58mm printer

### A4 Print Format
- **Full-size printable invoice**
- Professional layout with shop header
- Item table with alternating row colors
- Summary section with totals
- QR code integration
- PDF export option

### Windows Printer Support
- Auto-detect available printers
- Set default printer in settings
- Test print functionality
- Fallback to PDF if thermal not connected

---

## 4. DASHBOARD

### Today's Overview
- **Total Bills:** Count of bills created today
- **Total Sales:** Sum of all grand totals
- **Total Collection:** Sum of amount received
- **Average Bill Value:** Sales ÷ Bills count

### Auto-Refresh
- Dashboard updates every 30 seconds
- Real-time statistics
- Visual stat cards with color coding

### Quick Actions
- New Bill button
- Search Bills button
- View Reports button

---

## 5. SEARCH & HISTORY

### Search Filters
- **By Bill Number:** Exact or partial match
- **By Date Range:** From date to to date
- **By Mobile Number:** Customer mobile search

### Bill Actions
- **View Details:** Full bill with items
- **Reprint:** Print again on any printer
- **Cancel Bill:** Soft delete with reason (Admin only)

### Results Table
- Bill Number, Date, Time
- Customer Name, Mobile
- Item Count, Amount
- Payment Mode
- Action buttons (View, Print)

---

## 6. REPORTS SECTION

### Daily Report
- Total Bills, Total Sales, Collection
- List of all bills for selected date
- Export to PDF/Excel

### Date Range Report
- From Date → To Date selection
- Daily breakdown with totals
- Summary statistics
- Export to PDF/Excel

### Monthly Report
- Year selection
- Month-wise sales breakdown
- Total bills and sales per month
- Export to PDF/Excel

### Item Wise Report
- Most sold items ranking
- Quantity sold per item
- Total revenue per item
- Date range filter
- Export to PDF/Excel

### Operator Wise Report
- Bills created per operator
- Total amount per operator
- Date range filter
- Performance tracking
- Export to PDF/Excel

### Export Options
- **PDF Export:** Professional formatted report
- **Excel Export:** Spreadsheet with all data
- **Print Report:** Direct to printer

---

## 7. SETTINGS

### Shop Information
- Shop Name
- Address (multi-line)
- City, State, Pincode
- Contact Number
- Email Address
- GST Number
- Footer Message

### Branding
- **Logo Upload:** PNG/JPG/BMP support
- Logo preview in settings
- Logo appears on A4 invoices

### UPI Configuration
- UPI ID entry
- QR code preview
- Test QR generation

### Printer Selection
- List of available Windows printers
- Default printer setting
- Thermal printer configuration
- Test print button

### Backup Settings
- Auto backup toggle
- Backup location selection
- Manual backup button

---

## 8. BACKUP & RESTORE

### One-Click Backup
- Creates timestamped backup file
- Stores in `backups/` folder
- Format: `billingpro_backup_YYYYMMDD_HHMMSS.db`

### One-Click Restore
- Select backup file
- Safety backup of current DB before restore
- Confirmation dialog to prevent accidents
- Restart required after restore

### Automatic Daily Backup
- Enabled by default
- Runs every 24 hours
- Keeps last 30 backups (auto-cleanup)
- Configurable in settings

### Backup Management
- List all backups with details
- File size, creation date
- Restore from any backup
- Delete old backups

---

## 9. SECURITY

### User Authentication
- **Login Screen:** Username + Password
- **bcrypt hashing** for password security
- **Session management** per user

### Role-Based Access
- **Admin:** Full access (settings, users, backups, cancel bills)
- **Operator:** Billing only (create bills, view history, reprint)

### Default Users
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator | operator123 |

### Activity Log
- Tracks all user actions
- Timestamped entries
- Action descriptions
- User identification

---

## 10. UI DESIGN

### Modern Interface
- **Clean, professional design**
- **Dark sidebar** with light content area
- **Card-based layout** for information grouping
- **Color-coded elements:**
  - Blue: Primary actions
  - Green: Success/Positive
  - Red: Danger/Negative
  - Orange: Warnings
  - Purple: Statistics

### Large Buttons
- Touch-friendly sizing
- Clear visual hierarchy
- Hover effects for feedback

### Keyboard Friendly
- **Tab navigation** through all fields
- **Enter key** for quick actions
- **Function keys:**
  - F2: Save & Print
  - F3: Save Only
  - F5: Reset Form
  - F12: Add Item

### Fast Billing Workflow
1. Enter item description → Tab
2. Enter quantity → Tab
3. Enter rate → Enter (auto-adds item)
4. Repeat for more items
5. Enter discount (if any)
6. Enter amount received
7. Press F2 to save and print

---

## 11. DATABASE

### SQLite (Offline-First)
- **No server required**
- **No internet needed**
- **Fast local queries**
- **Auto-initialization** on first run

### Schema
- **users:** Authentication and roles
- **bills:** Bill headers with customer info
- **bill_items:** Line items for each bill
- **shop_settings:** Shop configuration
- **activity_log:** Audit trail

### Views (for Reports)
- **v_daily_sales:** Daily aggregated data
- **v_monthly_sales:** Monthly aggregated data
- **v_top_items:** Best-selling items
- **v_operator_performance:** Operator stats

### Indexes
- Optimized for fast searching
- Date-based queries
- Bill number lookups
- Mobile number searches

---

## 12. TECHNICAL SPECIFICATIONS

### Technology Stack
| Component | Technology |
|------------|-----------|
| GUI Framework | PySide6 (Qt6) |
| Database | SQLite3 |
| QR Generation | qrcode + Pillow |
| Thermal Printing | python-escpos |
| PDF Reports | ReportLab |
| Excel Export | openpyxl |
| Password Hashing | bcrypt |
| Packaging | PyInstaller |

### System Requirements
| Spec | Minimum | Recommended |
|------|---------|-------------|
| OS | Windows 10 64-bit | Windows 11 |
| RAM | 4 GB | 8 GB |
| Storage | 200 MB | 500 MB |
| Display | 1366×768 | 1920×1080 |
| Python | 3.9+ | 3.11+ |

---

## 13. RECEIPT EXAMPLE (58mm Thermal)

```
        MY SHOP NAME
    123 Main Street, City
      Contact: 9876543210

--------------------------------
Bill No: BILL-20260101-0001
Date: 01-01-2026 14:30:00
Customer: John Doe
Mobile: 9876543210
--------------------------------
Particular            Qty   Amt
Photo Copy              5  10.00
Color Printout          2  20.00
Lamination              1  30.00
--------------------------------
Sub Total:              ₹60.00
Discount:               ₹0.00
TOTAL:                  ₹60.00
Received:               ₹60.00
Balance:                ₹0.00
Mode: Cash
--------------------------------

        Scan & Pay
        [QR IMAGE]

    UPI ID: shopname@upi

    Thank You! Visit Again
    Operator: Admin


```

---

## 14. KEYBOARD SHORTCUTS REFERENCE

| Key | Action |
|-----|--------|
| F2 | Save & Print Bill |
| F3 | Save Bill Only |
| F5 | Reset/Clear Form |
| F12 | Add Current Item |
| Enter | Next field / Add item |
| Tab | Navigate fields |
| Ctrl+S | Save bill |
| Ctrl+P | Print |
| Ctrl+F | Search |
| Esc | Cancel/Go back |

---

**BillingPro v1.0.0** - Empowering Small Businesses
