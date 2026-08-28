"""
BillingPro - Billing Widget
===========================
Main billing interface for creating new bills.
Fast, keyboard-friendly workflow for retail shops.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                               QLineEdit, QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QFrame, QMessageBox, QSpinBox,
                               QDoubleSpinBox, QComboBox, QGroupBox, QGridLayout,
                               QScrollArea, QSplitter, QAbstractItemView)
from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QFont, QKeyEvent

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from src.database.db_manager import db
from src.printer.printer_manager import printer_manager
from src.utils.qr_utils import get_upi_qr_for_bill
from src.config import AppConfig


class BillingWidget(QWidget):
    """Main billing interface."""

    bill_saved = Signal(int)  # Emits bill_id when bill is saved

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_items = []
        self.current_bill_id = None
        self.setup_ui()
        self.reset_form()

    def setup_ui(self):
        """Setup billing UI."""
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # Left Panel - Bill Entry
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(15)

        # Header
        header = QLabel("New Bill")
        header.setFont(QFont("Segoe UI", 22, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        left_layout.addWidget(header)

        # Bill Info Card
        info_card = QFrame()
        info_card.setStyleSheet("""
            QFrame {
                background-color: white;
                border-radius: 10px;
                border: 1px solid #E0E0E0;
            }
        """)
        info_layout = QGridLayout(info_card)
        info_layout.setContentsMargins(20, 20, 20, 20)
        info_layout.setSpacing(12)

        # Bill Number
        info_layout.addWidget(QLabel("Bill No:"), 0, 0)
        self.bill_number_label = QLabel("--")
        self.bill_number_label.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.bill_number_label.setStyleSheet("color: #3498DB;")
        info_layout.addWidget(self.bill_number_label, 0, 1)

        # Date & Time
        info_layout.addWidget(QLabel("Date:"), 0, 2)
        self.date_label = QLabel("--")
        self.date_label.setFont(QFont("Segoe UI", 11))
        info_layout.addWidget(self.date_label, 0, 3)

        # Customer Name
        info_layout.addWidget(QLabel("Customer:"), 1, 0)
        self.customer_name = QLineEdit()
        self.customer_name.setPlaceholderText("Customer Name (Optional)")
        self.customer_name.setStyleSheet(self._input_style())
        info_layout.addWidget(self.customer_name, 1, 1)

        # Mobile
        info_layout.addWidget(QLabel("Mobile:"), 1, 2)
        self.customer_mobile = QLineEdit()
        self.customer_mobile.setPlaceholderText("Mobile Number")
        self.customer_mobile.setStyleSheet(self._input_style())
        info_layout.addWidget(self.customer_mobile, 1, 3)

        left_layout.addWidget(info_card)

        # Item Entry Section
        item_card = QFrame()
        item_card.setStyleSheet("""
            QFrame {
                background-color: white;
                border-radius: 10px;
                border: 1px solid #E0E0E0;
            }
        """)
        item_layout = QVBoxLayout(item_card)
        item_layout.setContentsMargins(20, 20, 20, 20)
        item_layout.setSpacing(12)

        item_header = QLabel("Add Items")
        item_header.setFont(QFont("Segoe UI", 14, QFont.Bold))
        item_header.setStyleSheet("color: #2C3E50;")
        item_layout.addWidget(item_header)

        # Item entry row
        entry_layout = QHBoxLayout()
        entry_layout.setSpacing(10)

        self.item_desc = QLineEdit()
        self.item_desc.setPlaceholderText("Item Description (e.g., Photo Copy)")
        self.item_desc.setStyleSheet(self._input_style())
        self.item_desc.setMinimumWidth(250)
        self.item_desc.returnPressed.connect(self.focus_qty)
        entry_layout.addWidget(self.item_desc, 2)

        self.item_qty = QDoubleSpinBox()
        self.item_qty.setRange(0.01, 9999)
        self.item_qty.setValue(1)
        self.item_qty.setDecimals(2)
        self.item_qty.setStyleSheet(self._spin_style())
        self.item_qty.setMinimumWidth(80)
        self.item_qty.valueChanged.connect(self.calculate_item_amount)
        entry_layout.addWidget(self.item_qty, 1)

        self.item_rate = QDoubleSpinBox()
        self.item_rate.setRange(0, 999999)
        self.item_rate.setValue(0)
        self.item_rate.setDecimals(2)
        self.item_rate.setStyleSheet(self._spin_style())
        self.item_rate.setMinimumWidth(100)
        self.item_rate.valueChanged.connect(self.calculate_item_amount)
        entry_layout.addWidget(self.item_rate, 1)

        self.item_amount = QLabel("₹0.00")
        self.item_amount.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.item_amount.setStyleSheet("color: #27AE60;")
        self.item_amount.setMinimumWidth(100)
        entry_layout.addWidget(self.item_amount)

        self.add_item_btn = QPushButton("+ Add")
        self.add_item_btn.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.add_item_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 25px;
            }
            QPushButton:hover {
                background-color: #2980B9;
            }
        """)
        self.add_item_btn.setCursor(Qt.PointingHandCursor)
        self.add_item_btn.clicked.connect(self.add_item)
        entry_layout.addWidget(self.add_item_btn)

        item_layout.addLayout(entry_layout)

        # Items Table
        self.items_table = QTableWidget()
        self.items_table.setColumnCount(5)
        self.items_table.setHorizontalHeaderLabels(["#", "Description", "Qty", "Rate (₹)", "Amount (₹)"])
        self.items_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.items_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Fixed)
        self.items_table.setColumnWidth(0, 40)
        self.items_table.setColumnWidth(2, 80)
        self.items_table.setColumnWidth(3, 100)
        self.items_table.setColumnWidth(4, 120)
        self.items_table.setStyleSheet("""
            QTableWidget {
                border: none;
                background-color: #F8F9FA;
                border-radius: 8px;
                gridline-color: #E0E0E0;
            }
            QHeaderView::section {
                background-color: #2C3E50;
                color: white;
                padding: 10px;
                font-weight: bold;
                border: none;
            }
            QTableWidget::item {
                padding: 8px;
            }
        """)
        self.items_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.items_table.setAlternatingRowColors(True)
        self.items_table.setMinimumHeight(200)
        item_layout.addWidget(self.items_table)

        # Remove item button
        remove_layout = QHBoxLayout()
        self.remove_item_btn = QPushButton("Remove Selected")
        self.remove_item_btn.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
            }
            QPushButton:hover {
                background-color: #C0392B;
            }
        """)
        self.remove_item_btn.setCursor(Qt.PointingHandCursor)
        self.remove_item_btn.clicked.connect(self.remove_selected_item)
        remove_layout.addWidget(self.remove_item_btn)
        remove_layout.addStretch()
        item_layout.addLayout(remove_layout)

        left_layout.addWidget(item_card)

        # Action Buttons
        action_layout = QHBoxLayout()
        action_layout.setSpacing(15)

        self.save_print_btn = QPushButton("Save & Print")
        self.save_print_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.save_print_btn.setStyleSheet("""
            QPushButton {
                background-color: #27AE60;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 30px;
            }
            QPushButton:hover {
                background-color: #229954;
            }
        """)
        self.save_print_btn.setCursor(Qt.PointingHandCursor)
        self.save_print_btn.setMinimumHeight(55)
        self.save_print_btn.clicked.connect(lambda: self.save_bill(print_receipt=True))
        action_layout.addWidget(self.save_print_btn)

        self.save_btn = QPushButton("Save Only")
        self.save_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.save_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 30px;
            }
            QPushButton:hover {
                background-color: #2980B9;
            }
        """)
        self.save_btn.setCursor(Qt.PointingHandCursor)
        self.save_btn.setMinimumHeight(55)
        self.save_btn.clicked.connect(lambda: self.save_bill(print_receipt=False))
        action_layout.addWidget(self.save_btn)

        self.reset_btn = QPushButton("Reset")
        self.reset_btn.setFont(QFont("Segoe UI", 12))
        self.reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #95A5A6;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 30px;
            }
            QPushButton:hover {
                background-color: #7F8C8D;
            }
        """)
        self.reset_btn.setCursor(Qt.PointingHandCursor)
        self.reset_btn.setMinimumHeight(55)
        self.reset_btn.clicked.connect(self.reset_form)
        action_layout.addWidget(self.reset_btn)

        action_layout.addStretch()
        left_layout.addLayout(action_layout)

        left_layout.addStretch()

        # Right Panel - Bill Summary & Preview
        right_panel = QWidget()
        right_panel.setFixedWidth(350)
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(15)

        # Summary Card
        summary_card = QFrame()
        summary_card.setStyleSheet("""
            QFrame {
                background-color: white;
                border-radius: 10px;
                border: 1px solid #E0E0E0;
            }
        """)
        summary_layout = QVBoxLayout(summary_card)
        summary_layout.setContentsMargins(25, 25, 25, 25)
        summary_layout.setSpacing(15)

        summary_header = QLabel("Bill Summary")
        summary_header.setFont(QFont("Segoe UI", 16, QFont.Bold))
        summary_header.setStyleSheet("color: #2C3E50;")
        summary_layout.addWidget(summary_header)

        # Sub Total
        sub_layout = QHBoxLayout()
        sub_layout.addWidget(QLabel("Sub Total:"))
        self.sub_total_label = QLabel("₹0.00")
        self.sub_total_label.setFont(QFont("Segoe UI", 14, QFont.Bold))
        self.sub_total_label.setStyleSheet("color: #2C3E50;")
        sub_layout.addStretch()
        sub_layout.addWidget(self.sub_total_label)
        summary_layout.addLayout(sub_layout)

        # Discount
        disc_layout = QHBoxLayout()
        disc_layout.addWidget(QLabel("Discount:"))
        self.discount_input = QDoubleSpinBox()
        self.discount_input.setRange(0, 999999)
        self.discount_input.setValue(0)
        self.discount_input.setDecimals(2)
        self.discount_input.setPrefix("₹")
        self.discount_input.setStyleSheet(self._spin_style())
        self.discount_input.valueChanged.connect(self.calculate_totals)
        disc_layout.addWidget(self.discount_input)
        summary_layout.addLayout(disc_layout)

        # Separator
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet("background-color: #E0E0E0;")
        line.setFixedHeight(2)
        summary_layout.addWidget(line)

        # Grand Total
        grand_layout = QHBoxLayout()
        grand_layout.addWidget(QLabel("Grand Total:"))
        self.grand_total_label = QLabel("₹0.00")
        self.grand_total_label.setFont(QFont("Segoe UI", 20, QFont.Bold))
        self.grand_total_label.setStyleSheet("color: #27AE60;")
        grand_layout.addStretch()
        grand_layout.addWidget(self.grand_total_label)
        summary_layout.addLayout(grand_layout)

        # Amount Received
        recv_layout = QHBoxLayout()
        recv_layout.addWidget(QLabel("Received:"))
        self.received_input = QDoubleSpinBox()
        self.received_input.setRange(0, 999999)
        self.received_input.setValue(0)
        self.received_input.setDecimals(2)
        self.received_input.setPrefix("₹")
        self.received_input.setStyleSheet(self._spin_style())
        self.received_input.valueChanged.connect(self.calculate_balance)
        recv_layout.addWidget(self.received_input)
        summary_layout.addLayout(recv_layout)

        # Balance
        bal_layout = QHBoxLayout()
        bal_layout.addWidget(QLabel("Balance:"))
        self.balance_label = QLabel("₹0.00")
        self.balance_label.setFont(QFont("Segoe UI", 14, QFont.Bold))
        self.balance_label.setStyleSheet("color: #E74C3C;")
        bal_layout.addStretch()
        bal_layout.addWidget(self.balance_label)
        summary_layout.addLayout(bal_layout)

        # Payment Mode
        mode_layout = QHBoxLayout()
        mode_layout.addWidget(QLabel("Payment Mode:"))
        self.payment_mode = QComboBox()
        self.payment_mode.addItems(["Cash", "Card", "UPI", "Mixed"])
        self.payment_mode.setStyleSheet("""
            QComboBox {
                border: 2px solid #E0E0E0;
                border-radius: 6px;
                padding: 8px;
                background-color: white;
            }
            QComboBox:focus {
                border: 2px solid #3498DB;
            }
        """)
        mode_layout.addWidget(self.payment_mode)
        summary_layout.addLayout(mode_layout)

        right_layout.addWidget(summary_card)

        # QR Code Preview
        self.qr_card = QFrame()
        self.qr_card.setStyleSheet("""
            QFrame {
                background-color: white;
                border-radius: 10px;
                border: 1px solid #E0E0E0;
            }
        """)
        qr_layout = QVBoxLayout(self.qr_card)
        qr_layout.setContentsMargins(25, 25, 25, 25)
        qr_layout.setSpacing(10)

        qr_header = QLabel("UPI Payment")
        qr_header.setFont(QFont("Segoe UI", 14, QFont.Bold))
        qr_header.setStyleSheet("color: #2C3E50;")
        qr_header.setAlignment(Qt.AlignCenter)
        qr_layout.addWidget(qr_header)

        self.qr_preview = QLabel("QR will appear here")
        self.qr_preview.setAlignment(Qt.AlignCenter)
        self.qr_preview.setMinimumHeight(200)
        self.qr_preview.setStyleSheet("""
            QLabel {
                background-color: #F8F9FA;
                border-radius: 8px;
                color: #95A5A6;
            }
        """)
        qr_layout.addWidget(self.qr_preview)

        self.upi_id_label = QLabel("UPI ID: --")
        self.upi_id_label.setAlignment(Qt.AlignCenter)
        self.upi_id_label.setStyleSheet("color: #7F8C8D;")
        qr_layout.addWidget(self.upi_id_label)

        right_layout.addWidget(self.qr_card)
        right_layout.addStretch()

        # Add panels to main layout
        main_layout.addWidget(left_panel, 2)
        main_layout.addWidget(right_panel, 1)

        # Set focus to item description
        QTimer.singleShot(100, self.item_desc.setFocus)

    def _input_style(self):
        return """
            QLineEdit {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 10px 12px;
                background-color: #F8F9FA;
                font-size: 12px;
            }
            QLineEdit:focus {
                border: 2px solid #3498DB;
                background-color: white;
            }
        """

    def _spin_style(self):
        return """
            QDoubleSpinBox {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 8px;
                background-color: #F8F9FA;
            }
            QDoubleSpinBox:focus {
                border: 2px solid #3498DB;
                background-color: white;
            }
        """

    def focus_qty(self):
        """Move focus to quantity field."""
        self.item_qty.setFocus()
        self.item_qty.selectAll()

    def calculate_item_amount(self):
        """Calculate amount for current item."""
        qty = self.item_qty.value()
        rate = self.item_rate.value()
        amount = qty * rate
        self.item_amount.setText(f"₹{amount:,.2f}")

    def add_item(self):
        """Add item to the bill."""
        desc = self.item_desc.text().strip()
        qty = self.item_qty.value()
        rate = self.item_rate.value()

        if not desc:
            QMessageBox.warning(self, "Error", "Please enter item description.")
            self.item_desc.setFocus()
            return

        if rate <= 0:
            QMessageBox.warning(self, "Error", "Please enter a valid rate.")
            self.item_rate.setFocus()
            return

        amount = qty * rate

        item = {
            'description': desc,
            'quantity': qty,
            'rate': rate,
            'amount': amount
        }

        self.current_items.append(item)
        self.refresh_items_table()
        self.calculate_totals()

        # Clear and focus
        self.item_desc.clear()
        self.item_qty.setValue(1)
        self.item_rate.setValue(0)
        self.item_amount.setText("₹0.00")
        self.item_desc.setFocus()

    def refresh_items_table(self):
        """Refresh the items table."""
        self.items_table.setRowCount(len(self.current_items))

        for row, item in enumerate(self.current_items):
            self.items_table.setItem(row, 0, QTableWidgetItem(str(row + 1)))
            self.items_table.setItem(row, 1, QTableWidgetItem(item['description']))
            self.items_table.setItem(row, 2, QTableWidgetItem(f"{item['quantity']:.2f}"))
            self.items_table.setItem(row, 3, QTableWidgetItem(f"₹{item['rate']:.2f}"))
            self.items_table.setItem(row, 4, QTableWidgetItem(f"₹{item['amount']:.2f}"))

            # Center align numbers
            for col in [0, 2, 3, 4]:
                self.items_table.item(row, col).setTextAlignment(Qt.AlignCenter)

    def remove_selected_item(self):
        """Remove selected item from the bill."""
        selected = self.items_table.selectedItems()
        if not selected:
            QMessageBox.information(self, "Info", "Please select an item to remove.")
            return

        row = selected[0].row()
        del self.current_items[row]
        self.refresh_items_table()
        self.calculate_totals()

    def calculate_totals(self):
        """Calculate bill totals."""
        sub_total = sum(item['amount'] for item in self.current_items)
        discount = self.discount_input.value()
        grand_total = max(0, sub_total - discount)

        self.sub_total_label.setText(f"₹{sub_total:,.2f}")
        self.grand_total_label.setText(f"₹{grand_total:,.2f}")

        # Update received if it's the first item
        if not self.current_items:
            self.received_input.setValue(0)

        self.calculate_balance()
        self.update_qr_preview(grand_total)

    def calculate_balance(self):
        """Calculate balance amount."""
        sub_total = sum(item['amount'] for item in self.current_items)
        discount = self.discount_input.value()
        grand_total = max(0, sub_total - discount)
        received = self.received_input.value()
        balance = received - grand_total

        self.balance_label.setText(f"₹{balance:,.2f}")

        if balance < 0:
            self.balance_label.setStyleSheet("color: #E74C3C;")
        else:
            self.balance_label.setStyleSheet("color: #27AE60;")

    def update_qr_preview(self, amount):
        """Update QR code preview."""
        settings = db.get_shop_settings()
        upi_id = settings.get('upi_id', '')
        shop_name = settings.get('shop_name', '')

        if upi_id and amount > 0:
            try:
                qr_path = get_upi_qr_for_bill(upi_id, amount, shop_name)
                from PySide6.QtGui import QPixmap
                pixmap = QPixmap(qr_path)
                scaled = pixmap.scaled(180, 180, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                self.qr_preview.setPixmap(scaled)
                self.qr_preview.setText("")
                self.upi_id_label.setText(f"UPI ID: {upi_id}")
            except Exception as e:
                self.qr_preview.setText("QR Error")
                print(f"QR Error: {e}")
        else:
            self.qr_preview.setText("QR will appear here")
            self.qr_preview.setPixmap(QPixmap())
            self.upi_id_label.setText("UPI ID: --")

    def save_bill(self, print_receipt=False):
        """Save the bill to database."""
        if not self.current_items:
            QMessageBox.warning(self, "Error", "Please add at least one item.")
            return

        sub_total = sum(item['amount'] for item in self.current_items)
        discount = self.discount_input.value()
        grand_total = max(0, sub_total - discount)
        received = self.received_input.value()
        balance = received - grand_total

        now = datetime.now()

        # Get current user from parent
        main_window = self.window()
        created_by = main_window.current_user['id'] if hasattr(main_window, 'current_user') else 1

        bill_data = {
            'bill_number': db.get_next_bill_number(),
            'bill_date': now.strftime("%Y-%m-%d"),
            'bill_time': now.strftime("%H:%M:%S"),
            'customer_name': self.customer_name.text().strip(),
            'customer_mobile': self.customer_mobile.text().strip(),
            'sub_total': sub_total,
            'discount_amount': discount,
            'grand_total': grand_total,
            'amount_received': received,
            'balance_amount': balance,
            'payment_mode': self.payment_mode.currentText(),
            'created_by': created_by,
            'items': self.current_items
        }

        try:
            bill_id = db.create_bill(bill_data)
            self.current_bill_id = bill_id

            # Get full bill data for printing
            full_bill = db.get_bill_by_id(bill_id)
            settings = db.get_shop_settings()

            if print_receipt:
                self.print_receipt(full_bill, settings)

            QMessageBox.information(self, "Success", 
                                  f"Bill {bill_data['bill_number']} saved successfully!")

            self.bill_saved.emit(bill_id)
            self.reset_form()

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save bill: {str(e)}")

    def print_receipt(self, bill_data, settings):
        """Print the receipt."""
        try:
            # Try thermal printer first
            if printer_manager.print_bill_thermal(bill_data, settings):
                QMessageBox.information(self, "Printed", "Receipt printed on thermal printer.")
                return
        except Exception as e:
            print(f"Thermal print failed: {e}")

        # Fallback to A4/PDF
        try:
            pdf_path = printer_manager.print_bill_a4(bill_data, settings)
            QMessageBox.information(self, "Generated", f"PDF saved: {pdf_path}")
        except Exception as e:
            QMessageBox.warning(self, "Print Error", f"Could not print: {str(e)}")

    def reset_form(self):
        """Reset the billing form."""
        self.current_items = []
        self.current_bill_id = None

        # Generate new bill number
        self.bill_number_label.setText(db.get_next_bill_number())

        now = datetime.now()
        self.date_label.setText(now.strftime("%d-%m-%Y %H:%M:%S"))

        self.customer_name.clear()
        self.customer_mobile.clear()

        self.item_desc.clear()
        self.item_qty.setValue(1)
        self.item_rate.setValue(0)
        self.item_amount.setText("₹0.00")

        self.items_table.setRowCount(0)

        self.discount_input.setValue(0)
        self.received_input.setValue(0)
        self.payment_mode.setCurrentIndex(0)

        self.sub_total_label.setText("₹0.00")
        self.grand_total_label.setText("₹0.00")
        self.balance_label.setText("₹0.00")

        self.qr_preview.setText("QR will appear here")
        self.qr_preview.setPixmap(QPixmap())
        self.upi_id_label.setText("UPI ID: --")

        self.item_desc.setFocus()

    def keyPressEvent(self, event):
        """Handle keyboard shortcuts."""
        if event.key() == Qt.Key_F2:
            self.save_bill(print_receipt=True)
        elif event.key() == Qt.Key_F3:
            self.save_bill(print_receipt=False)
        elif event.key() == Qt.Key_F5:
            self.reset_form()
        elif event.key() == Qt.Key_F12:
            self.add_item()
        else:
            super().keyPressEvent(event)
