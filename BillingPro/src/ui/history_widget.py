"""
BillingPro - History Widget
===========================
Bill search, view, reprint, and edit functionality.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QInputDialog,
                               QLineEdit, QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QFrame, QMessageBox, QDateEdit,
                               QComboBox, QDialog, QTextEdit, QGridLayout,
                               QDialogButtonBox, QAbstractItemView)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont

from src.database.db_manager import db
from src.printer.printer_manager import printer_manager


class BillDetailDialog(QDialog):
    """Dialog to show bill details."""

    def __init__(self, bill_data, parent=None):
        super().__init__(parent)
        self.bill_data = bill_data
        self.setWindowTitle(f"Bill Details - {bill_data['bill_number']}")
        self.setMinimumSize(600, 500)
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        # Bill Header
        header = QLabel(f"Bill: {self.bill_data['bill_number']}")
        header.setFont(QFont("Segoe UI", 16, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        # Info Grid
        info_grid = QGridLayout()
        info_grid.addWidget(QLabel("Date:"), 0, 0)
        info_grid.addWidget(QLabel(f"{self.bill_data['bill_date']} {self.bill_data['bill_time']}"), 0, 1)

        info_grid.addWidget(QLabel("Customer:"), 1, 0)
        info_grid.addWidget(QLabel(self.bill_data.get('customer_name', 'Walk-in')), 1, 1)

        info_grid.addWidget(QLabel("Mobile:"), 2, 0)
        info_grid.addWidget(QLabel(self.bill_data.get('customer_mobile', '--')), 2, 1)

        info_grid.addWidget(QLabel("Operator:"), 3, 0)
        info_grid.addWidget(QLabel(self.bill_data.get('operator_name', '--')), 3, 1)

        layout.addLayout(info_grid)
        layout.addSpacing(10)

        # Items Table
        items_table = QTableWidget()
        items_table.setColumnCount(4)
        items_table.setHorizontalHeaderLabels(["Description", "Qty", "Rate", "Amount"])
        items_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        items_table.setRowCount(len(self.bill_data.get('items', [])))

        for row, item in enumerate(self.bill_data.get('items', [])):
            items_table.setItem(row, 0, QTableWidgetItem(item['item_description']))
            items_table.setItem(row, 1, QTableWidgetItem(f"{item['quantity']:.0f}"))
            items_table.setItem(row, 2, QTableWidgetItem(f"₹{item['rate']:.2f}"))
            items_table.setItem(row, 3, QTableWidgetItem(f"₹{item['amount']:.2f}"))

        layout.addWidget(items_table)

        # Summary
        summary_layout = QHBoxLayout()
        summary_layout.addStretch()
        summary_label = QLabel(
            f"Sub Total: ₹{self.bill_data['sub_total']:.2f} | "
            f"Discount: ₹{self.bill_data.get('discount_amount', 0):.2f} | "
            f"Grand Total: ₹{self.bill_data['grand_total']:.2f}"
        )
        summary_label.setFont(QFont("Segoe UI", 12, QFont.Bold))
        summary_label.setStyleSheet("color: #27AE60;")
        summary_layout.addWidget(summary_label)
        layout.addLayout(summary_layout)

        # Buttons
        btn_layout = QHBoxLayout()

        reprint_btn = QPushButton("Reprint")
        reprint_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 25px;
            }
            QPushButton:hover { background-color: #2980B9; }
        """)
        reprint_btn.clicked.connect(self.reprint_bill)
        btn_layout.addWidget(reprint_btn)

        cancel_btn = QPushButton("Cancel Bill")
        cancel_btn.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 25px;
            }
            QPushButton:hover { background-color: #C0392B; }
        """)
        cancel_btn.clicked.connect(self.cancel_bill)
        btn_layout.addWidget(cancel_btn)

        btn_layout.addStretch()

        close_btn = QPushButton("Close")
        close_btn.clicked.connect(self.close)
        btn_layout.addWidget(close_btn)

        layout.addLayout(btn_layout)

    def reprint_bill(self):
        """Reprint the bill."""
        settings = db.get_shop_settings()
        try:
            if printer_manager.print_bill_thermal(self.bill_data, settings):
                QMessageBox.information(self, "Success", "Bill reprinted successfully.")
            else:
                pdf_path = printer_manager.print_bill_a4(self.bill_data, settings)
                QMessageBox.information(self, "Generated", f"PDF saved: {pdf_path}")
        except Exception as e:
            QMessageBox.warning(self, "Error", f"Print failed: {str(e)}")

    def cancel_bill(self):
        """Cancel the bill."""
        reply = QMessageBox.question(
            self, "Cancel Bill",
            "Are you sure you want to cancel this bill? This action cannot be undone.",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            reason, ok = QInputDialog.getText(self, "Cancellation Reason", 
                                            "Please enter reason for cancellation:")
            if ok and reason:
                main_window = self.window()
                user_id = main_window.current_user['id'] if hasattr(main_window, 'current_user') else 1
                db.cancel_bill(self.bill_data['id'], reason, user_id)
                QMessageBox.information(self, "Cancelled", "Bill has been cancelled.")
                self.close()


class HistoryWidget(QWidget):
    """Bill history and search widget."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_recent_bills()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Header
        header = QLabel("Bill History & Search")
        header.setFont(QFont("Segoe UI", 22, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        # Search Panel
        search_card = QFrame()
        search_card.setStyleSheet("""
            QFrame {
                background-color: white;
                border-radius: 10px;
                border: 1px solid #E0E0E0;
            }
        """)
        search_layout = QHBoxLayout(search_card)
        search_layout.setContentsMargins(20, 15, 20, 15)
        search_layout.setSpacing(15)

        # Bill Number Search
        self.search_bill = QLineEdit()
        self.search_bill.setPlaceholderText("Search by Bill Number...")
        self.search_bill.setStyleSheet(self._input_style())
        self.search_bill.setMinimumWidth(180)
        search_layout.addWidget(self.search_bill)

        # Date From
        self.date_from = QDateEdit()
        self.date_from.setCalendarPopup(True)
        self.date_from.setDate(QDate.currentDate().addDays(-7))
        self.date_from.setStyleSheet(self._input_style())
        search_layout.addWidget(self.date_from)

        # Date To
        self.date_to = QDateEdit()
        self.date_to.setCalendarPopup(True)
        self.date_to.setDate(QDate.currentDate())
        self.date_to.setStyleSheet(self._input_style())
        search_layout.addWidget(self.date_to)

        # Mobile Search
        self.search_mobile = QLineEdit()
        self.search_mobile.setPlaceholderText("Search by Mobile...")
        self.search_mobile.setStyleSheet(self._input_style())
        self.search_mobile.setMinimumWidth(150)
        search_layout.addWidget(self.search_mobile)

        # Search Button
        search_btn = QPushButton("Search")
        search_btn.setFont(QFont("Segoe UI", 11, QFont.Bold))
        search_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 25px;
            }
            QPushButton:hover { background-color: #2980B9; }
        """)
        search_btn.setCursor(Qt.PointingHandCursor)
        search_btn.clicked.connect(self.search_bills)
        search_layout.addWidget(search_btn)

        # Refresh Button
        refresh_btn = QPushButton("Refresh")
        refresh_btn.setStyleSheet("""
            QPushButton {
                background-color: #95A5A6;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
            }
            QPushButton:hover { background-color: #7F8C8D; }
        """)
        refresh_btn.setCursor(Qt.PointingHandCursor)
        refresh_btn.clicked.connect(self.load_recent_bills)
        search_layout.addWidget(refresh_btn)

        layout.addWidget(search_card)

        # Results Table
        self.results_table = QTableWidget()
        self.results_table.setColumnCount(8)
        self.results_table.setHorizontalHeaderLabels([
            "Bill No", "Date", "Time", "Customer", "Mobile", 
            "Items", "Amount", "Actions"
        ])
        self.results_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        self.results_table.setStyleSheet("""
            QTableWidget {
                border: none;
                background-color: white;
                border-radius: 10px;
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
        self.results_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.results_table.setAlternatingRowColors(True)
        self.results_table.cellDoubleClicked.connect(self.view_bill_detail)
        layout.addWidget(self.results_table)

        # Results count
        self.results_count = QLabel("Showing recent bills")
        self.results_count.setStyleSheet("color: #7F8C8D;")
        layout.addWidget(self.results_count)

    def _input_style(self):
        return """
            QLineEdit, QDateEdit {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 8px 12px;
                background-color: #F8F9FA;
            }
            QLineEdit:focus, QDateEdit:focus {
                border: 2px solid #3498DB;
                background-color: white;
            }
        """

    def load_recent_bills(self):
        """Load recent bills."""
        bills = db.search_bills()
        self.populate_table(bills)
        self.results_count.setText(f"Showing {len(bills)} recent bills")

    def search_bills(self):
        """Search bills with filters."""
        search_term = self.search_bill.text().strip()
        date_from = self.date_from.date().toString("yyyy-MM-dd")
        date_to = self.date_to.date().toString("yyyy-MM-dd")
        mobile = self.search_mobile.text().strip()

        bills = db.search_bills(
            search_term=search_term if search_term else None,
            date_from=date_from,
            date_to=date_to,
            mobile=mobile if mobile else None
        )

        self.populate_table(bills)
        self.results_count.setText(f"Found {len(bills)} bills")

    def populate_table(self, bills):
        """Populate results table."""
        self.results_table.setRowCount(len(bills))

        for row, bill in enumerate(bills):
            self.results_table.setItem(row, 0, QTableWidgetItem(bill['bill_number']))
            self.results_table.setItem(row, 1, QTableWidgetItem(bill['bill_date']))
            self.results_table.setItem(row, 2, QTableWidgetItem(bill['bill_time']))
            self.results_table.setItem(row, 3, QTableWidgetItem(bill.get('customer_name', 'Walk-in')))
            self.results_table.setItem(row, 4, QTableWidgetItem(bill.get('customer_mobile', '--')))

            # Count items
            full_bill = db.get_bill_by_id(bill['id'])
            item_count = len(full_bill.get('items', [])) if full_bill else 0
            self.results_table.setItem(row, 5, QTableWidgetItem(str(item_count)))

            amount_item = QTableWidgetItem(f"₹{bill['grand_total']:.2f}")
            amount_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
            self.results_table.setItem(row, 6, amount_item)

            # Action buttons
            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(5, 2, 5, 2)
            action_layout.setSpacing(5)

            view_btn = QPushButton("View")
            view_btn.setStyleSheet("""
                QPushButton {
                    background-color: #3498DB;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 10px;
                }
                QPushButton:hover { background-color: #2980B9; }
            """)
            view_btn.clicked.connect(lambda checked, b=bill: self.view_bill(b['id']))
            action_layout.addWidget(view_btn)

            reprint_btn = QPushButton("Print")
            reprint_btn.setStyleSheet("""
                QPushButton {
                    background-color: #27AE60;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 10px;
                }
                QPushButton:hover { background-color: #229954; }
            """)
            reprint_btn.clicked.connect(lambda checked, b=bill: self.reprint_bill(b['id']))
            action_layout.addWidget(reprint_btn)

            action_layout.addStretch()
            self.results_table.setCellWidget(row, 7, action_widget)

            # Align center for most columns
            for col in range(7):
                if self.results_table.item(row, col):
                    if col in [5, 6]:
                        self.results_table.item(row, col).setTextAlignment(Qt.AlignCenter)

    def view_bill(self, bill_id):
        """View bill details."""
        bill = db.get_bill_by_id(bill_id)
        if bill:
            dialog = BillDetailDialog(bill, self)
            dialog.exec()

    def view_bill_detail(self, row, column):
        """Handle double click on table."""
        bill_id = self.results_table.item(row, 0).data(Qt.UserRole)
        if not bill_id:
            # Get from search results
            bill_number = self.results_table.item(row, 0).text()
            bill = db.get_bill_by_number(bill_number)
            if bill:
                dialog = BillDetailDialog(bill, self)
                dialog.exec()

    def reprint_bill(self, bill_id):
        """Reprint a bill."""
        bill = db.get_bill_by_id(bill_id)
        if bill:
            settings = db.get_shop_settings()
            try:
                if printer_manager.print_bill_thermal(bill, settings):
                    QMessageBox.information(self, "Success", "Bill reprinted successfully.")
                else:
                    pdf_path = printer_manager.print_bill_a4(bill, settings)
                    QMessageBox.information(self, "Generated", f"PDF saved: {pdf_path}")
            except Exception as e:
                QMessageBox.warning(self, "Error", f"Print failed: {str(e)}")

    def refresh_data(self):
        """Refresh data when page is shown."""
        self.load_recent_bills()
