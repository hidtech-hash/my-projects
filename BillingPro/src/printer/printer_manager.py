"""
BillingPro - Printer Module
===========================
Handles thermal printer (58mm) and A4 printing.
Supports ESC/POS thermal printers and Windows printers.
"""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

try:
    from escpos.printer import Usb, Network, Serial
    from escpos.exceptions import Error as EscposError
    ESCPOS_AVAILABLE = True
except ImportError:
    ESCPOS_AVAILABLE = False

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from src.config import AppConfig
from src.database.db_manager import db


class ThermalPrinter:
    """58mm Thermal Printer Handler (ESC/POS)."""

    THERMAL_WIDTH = 48  # Characters per line for 58mm

    def __init__(self, vendor_id: int = None, product_id: int = None,
                 in_ep: int = 0x81, out_ep: int = 0x03, profile: str = "POS-5890"):
        self.vendor_id = vendor_id
        self.product_id = product_id
        self.in_ep = in_ep
        self.out_ep = out_ep
        self.profile = profile
        self.printer = None

    def connect(self) -> bool:
        """Connect to USB thermal printer."""
        if not ESCPOS_AVAILABLE:
            return False

        try:
            if self.vendor_id and self.product_id:
                self.printer = Usb(
                    self.vendor_id, self.product_id,
                    in_ep=self.in_ep, out_ep=self.out_ep,
                    profile=self.profile
                )
                return True
            return False
        except Exception as e:
            print(f"Thermal printer connection error: {e}")
            return False

    def print_receipt(self, bill_data: Dict, shop_settings: Dict) -> bool:
        """Print receipt on 58mm thermal printer."""
        if not self.printer:
            if not self.connect():
                return False

        try:
            p = self.printer
            w = self.THERMAL_WIDTH

            # Center align
            p.set(align='center', bold=True, double_height=True)

            # Shop Name
            shop_name = shop_settings.get('shop_name', 'My Shop')
            p.text(shop_name[:w].center(w) + "\n")

            p.set(align='center', bold=False, double_height=False)

            # Address
            address = shop_settings.get('address', '')
            if address:
                p.text(address[:w].center(w) + "\n")

            # Contact
            contact = shop_settings.get('contact_number', '')
            if contact:
                p.text(f"Contact: {contact}"[:w].center(w) + "\n")

            # GST
            gst = shop_settings.get('gst_number', '')
            if gst:
                p.text(f"GST: {gst}"[:w].center(w) + "\n")

            # Separator
            p.text("-" * w + "\n")

            # Bill Info
            p.set(align='left')
            p.text(f"Bill No: {bill_data['bill_number']}\n")
            p.text(f"Date: {bill_data['bill_date']} {bill_data['bill_time']}\n")

            if bill_data.get('customer_name'):
                p.text(f"Customer: {bill_data['customer_name']}\n")
            if bill_data.get('customer_mobile'):
                p.text(f"Mobile: {bill_data['customer_mobile']}\n")

            p.text("-" * w + "\n")

            # Header
            p.set(bold=True)
            header = f"{'Particular':<22}{'Qty':>6}{'Rate':>8}{'Amt':>10}"
            p.text(header[:w] + "\n")
            p.set(bold=False)
            p.text("-" * w + "\n")

            # Items
            for item in bill_data.get('items', []):
                desc = item['item_description'][:20]
                qty = f"{item['quantity']:.0f}"
                rate = f"{item['rate']:.2f}"
                amt = f"{item['amount']:.2f}"
                line = f"{desc:<20}{qty:>6}{rate:>8}{amt:>10}"
                p.text(line[:w] + "\n")

            p.text("-" * w + "\n")

            # Summary
            p.set(align='right')
            p.text(f"Sub Total: ₹{bill_data['sub_total']:.2f}\n")

            if bill_data.get('discount_amount', 0) > 0:
                p.text(f"Discount: ₹{bill_data['discount_amount']:.2f}\n")

            p.set(bold=True, double_height=True)
            p.text(f"TOTAL: ₹{bill_data['grand_total']:.2f}\n")
            p.set(bold=False, double_height=False)

            p.text(f"Received: ₹{bill_data.get('amount_received', 0):.2f}\n")
            p.text(f"Balance: ₹{bill_data.get('balance_amount', 0):.2f}\n")
            p.text(f"Mode: {bill_data.get('payment_mode', 'Cash')}\n")

            p.text("-" * w + "\n")

            # UPI QR Code
            upi_id = shop_settings.get('upi_id', '')
            if upi_id:
                p.set(align='center')
                p.text("\nScan & Pay\n")
                p.text(f"UPI: {upi_id}\n")

                # Generate and print QR
                from src.utils.qr_utils import QRCodeGenerator
                qr_path = QRCodeGenerator.generate_upi_qr(
                    upi_id, bill_data['grand_total'], shop_name
                )

                if os.path.exists(qr_path):
                    p.image(qr_path)
                    p.text("\n")

            # Footer
            p.set(align='center')
            footer = shop_settings.get('footer_message', 'Thank You! Visit Again')
            p.text("\n" + footer[:w].center(w) + "\n")
            p.text(f"Operator: {bill_data.get('operator_name', 'Operator')}\n")
            p.text("\n\n\n")

            # Cut paper
            p.cut()

            return True

        except Exception as e:
            print(f"Thermal print error: {e}")
            return False

    def print_test_page(self) -> bool:
        """Print a test page."""
        if not self.printer:
            if not self.connect():
                return False

        try:
            p = self.printer
            p.set(align='center', bold=True, double_height=True)
            p.text("\n\nBILLINGPRO\n")
            p.set(bold=False, double_height=False)
            p.text("Printer Test Page\n")
            p.text("-" * self.THERMAL_WIDTH + "\n")
            p.text("Printer is working correctly!\n")
            p.text("\n\n\n")
            p.cut()
            return True
        except Exception as e:
            print(f"Test print error: {e}")
            return False


class A4Printer:
    """A4 Invoice Printer using ReportLab."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='ShopName',
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=6
        ))

        self.styles.add(ParagraphStyle(
            name='ShopInfo',
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#7F8C8D')
        ))

        self.styles.add(ParagraphStyle(
            name='BillTitle',
            fontSize=16,
            leading=20,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=12
        ))

        self.styles.add(ParagraphStyle(
            name='TotalAmount',
            fontSize=18,
            leading=24,
            alignment=TA_RIGHT,
            textColor=colors.HexColor('#27AE60'),
            spaceBefore=12
        ))

    def generate_pdf(self, bill_data: Dict, shop_settings: Dict, 
                     output_path: str = None) -> str:
        """Generate A4 PDF invoice."""

        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(AppConfig.TEMP_DIR / f"invoice_{timestamp}.pdf")

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )

        elements = []

        # Shop Header
        shop_name = shop_settings.get('shop_name', 'My Shop')
        elements.append(Paragraph(shop_name, self.styles['ShopName']))

        address = shop_settings.get('address', '')
        city = shop_settings.get('city', '')
        state = shop_settings.get('state', '')
        full_address = f"{address}, {city}, {state}".strip(', ')
        if full_address:
            elements.append(Paragraph(full_address, self.styles['ShopInfo']))

        contact = shop_settings.get('contact_number', '')
        email = shop_settings.get('email', '')
        contact_info = []
        if contact:
            contact_info.append(f"Contact: {contact}")
        if email:
            contact_info.append(f"Email: {email}")
        if contact_info:
            elements.append(Paragraph(" | ".join(contact_info), self.styles['ShopInfo']))

        gst = shop_settings.get('gst_number', '')
        if gst:
            elements.append(Paragraph(f"GST No: {gst}", self.styles['ShopInfo']))

        elements.append(Spacer(1, 20))

        # Bill Information
        elements.append(Paragraph(f"TAX INVOICE", self.styles['BillTitle']))

        bill_info_data = [
            ["Bill Number:", bill_data['bill_number'], "Date:", f"{bill_data['bill_date']} {bill_data['bill_time']}"],
        ]

        if bill_data.get('customer_name'):
            bill_info_data.append(["Customer:", bill_data['customer_name'], "Mobile:", bill_data.get('customer_mobile', '')])

        bill_info_table = Table(bill_info_data, colWidths=[25*mm, 60*mm, 25*mm, 60*mm])
        bill_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#7F8C8D')),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#7F8C8D')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(bill_info_table)
        elements.append(Spacer(1, 20))

        # Items Table
        items_data = [["#", "Description", "Qty", "Rate (₹)", "Amount (₹)"]]

        for idx, item in enumerate(bill_data.get('items', []), 1):
            items_data.append([
                str(idx),
                item['item_description'],
                f"{item['quantity']:.0f}",
                f"{item['rate']:.2f}",
                f"{item['amount']:.2f}"
            ])

        items_table = Table(items_data, colWidths=[15*mm, 80*mm, 20*mm, 30*mm, 30*mm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 20))

        # Summary
        summary_data = [
            ["", "Sub Total:", f"₹{bill_data['sub_total']:.2f}"],
        ]

        if bill_data.get('discount_amount', 0) > 0:
            summary_data.append(["", "Discount:", f"₹{bill_data['discount_amount']:.2f}"])

        summary_data.extend([
            ["", "Grand Total:", f"₹{bill_data['grand_total']:.2f}"],
            ["", "Amount Received:", f"₹{bill_data.get('amount_received', 0):.2f}"],
            ["", "Balance:", f"₹{bill_data.get('balance_amount', 0):.2f}"],
            ["", "Payment Mode:", bill_data.get('payment_mode', 'Cash')],
        ])

        summary_table = Table(summary_data, colWidths=[100*mm, 40*mm, 35*mm])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTNAME', (1, -3), (-1, -3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('TEXTCOLOR', (1, -3), (1, -3), colors.HexColor('#27AE60')),
            ('TEXTCOLOR', (2, -3), (2, -3), colors.HexColor('#27AE60')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEABOVE', (1, -3), (-1, -3), 1, colors.HexColor('#2C3E50')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 30))

        # QR Code
        upi_id = shop_settings.get('upi_id', '')
        if upi_id:
            from src.utils.qr_utils import QRCodeGenerator
            qr_path = QRCodeGenerator.generate_upi_qr(
                upi_id, bill_data['grand_total'], shop_name
            )

            if os.path.exists(qr_path):
                qr_img = RLImage(qr_path, width=40*mm, height=50*mm)
                qr_data = [
                    [qr_img, ""],
                    [Paragraph("Scan & Pay via UPI", self.styles['ShopInfo']), ""]
                ]
                qr_table = Table(qr_data, colWidths=[50*mm, 100*mm])
                qr_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                elements.append(qr_table)
                elements.append(Spacer(1, 20))

        # Footer
        footer = shop_settings.get('footer_message', 'Thank You! Visit Again')
        elements.append(Paragraph(footer, self.styles['ShopInfo']))
        elements.append(Paragraph(
            f"Generated by {shop_name} | Operator: {bill_data.get('operator_name', 'Operator')}",
            self.styles['ShopInfo']
        ))

        # Build PDF
        doc.build(elements)
        return output_path

    def print_to_windows_printer(self, pdf_path: str, printer_name: str = None) -> bool:
        """Print PDF to Windows printer."""
        try:
            import win32print
            import win32api

            if printer_name:
                win32print.SetDefaultPrinter(printer_name)

            win32api.ShellExecute(0, "print", pdf_path, None, ".", 0)
            return True
        except Exception as e:
            print(f"Windows print error: {e}")
            return False


class PrinterManager:
    """Central printer management."""

    def __init__(self):
        self.thermal = ThermalPrinter()
        self.a4 = A4Printer()

    def print_bill_thermal(self, bill_data: Dict, shop_settings: Dict) -> bool:
        """Print bill on thermal printer."""
        return self.thermal.print_receipt(bill_data, shop_settings)

    def print_bill_a4(self, bill_data: Dict, shop_settings: Dict, 
                      printer_name: str = None) -> str:
        """Generate and print A4 invoice."""
        pdf_path = self.a4.generate_pdf(bill_data, shop_settings)

        # Try to print if on Windows
        if os.name == 'nt':
            self.a4.print_to_windows_printer(pdf_path, printer_name)

        return pdf_path

    def get_available_printers(self) -> List[str]:
        """Get list of available printers."""
        printers = []

        if os.name == 'nt':
            try:
                import win32print
                for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL):
                    printers.append(printer[2])
            except:
                pass

        return printers


# Global printer instance
printer_manager = PrinterManager()
