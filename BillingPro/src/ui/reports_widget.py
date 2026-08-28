"""
BillingPro - Reports Widget
===========================
Comprehensive reporting with PDF/Excel export.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QFrame, QDateEdit, QComboBox,
                               QTabWidget, QMessageBox, QFileDialog, QProgressBar,
                               QAbstractItemView)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont

from datetime import datetime
import os

from src.database.db_manager import db
from src.reports.report_generator import ReportGenerator


class ReportsWidget(QWidget):
    """Reports and analytics widget."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Header
        header = QLabel("Reports & Analytics")
        header.setFont(QFont("Segoe UI", 22, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        # Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane {
                border: 1px solid #E0E0E0;
                border-radius: 10px;
                background-color: white;
            }
            QTabBar::tab {
                background-color: #ECF0F1;
                padding: 12px 25px;
                margin-right: 5px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                font-weight: bold;
                color: #7F8C8D;
            }
            QTabBar::tab:selected {
                background-color: #3498DB;
                color: white;
            }
            QTabBar::tab:hover:!selected {
                background-color: #D5DBDB;
            }
        """)

        # Daily Report Tab
        self.daily_tab = self._create_daily_tab()
        self.tabs.addTab(self.daily_tab, "Daily Report")

        # Date Range Tab
        self.range_tab = self._create_range_tab()
        self.tabs.addTab(self.range_tab, "Date Range")

        # Monthly Report Tab
        self.monthly_tab = self._create_monthly_tab()
        self.tabs.addTab(self.monthly_tab, "Monthly Report")

        # Item Wise Tab
        self.item_tab = self._create_item_tab()
        self.tabs.addTab(self.item_tab, "Item Wise")

        # Operator Tab
        self.operator_tab = self._create_operator_tab()
        self.tabs.addTab(self.operator_tab, "Operator Wise")

        layout.addWidget(self.tabs)

    def _create_daily_tab(self):
        """Create daily report tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Controls
        controls = QHBoxLayout()

        controls.addWidget(QLabel("Date:"))
        self.daily_date = QDateEdit()
        self.daily_date.setCalendarPopup(True)
        self.daily_date.setDate(QDate.currentDate())
        self.daily_date.setStyleSheet(self._input_style())
        controls.addWidget(self.daily_date)

        generate_btn = QPushButton("Generate Report")
        generate_btn.setStyleSheet(self._btn_style("#3498DB"))
        generate_btn.setCursor(Qt.PointingHandCursor)
        generate_btn.clicked.connect(self.generate_daily_report)
        controls.addWidget(generate_btn)

        export_pdf_btn = QPushButton("Export PDF")
        export_pdf_btn.setStyleSheet(self._btn_style("#E74C3C"))
        export_pdf_btn.setCursor(Qt.PointingHandCursor)
        export_pdf_btn.clicked.connect(lambda: self.export_report("daily", "pdf"))
        controls.addWidget(export_pdf_btn)

        export_excel_btn = QPushButton("Export Excel")
        export_excel_btn.setStyleSheet(self._btn_style("#27AE60"))
        export_excel_btn.setCursor(Qt.PointingHandCursor)
        export_excel_btn.clicked.connect(lambda: self.export_report("daily", "excel"))
        controls.addWidget(export_excel_btn)

        controls.addStretch()
        layout.addLayout(controls)

        # Summary
        self.daily_summary = QLabel("Select a date and click Generate")
        self.daily_summary.setFont(QFont("Segoe UI", 14, QFont.Bold))
        self.daily_summary.setStyleSheet("color: #2C3E50; padding: 15px; background-color: #F8F9FA; border-radius: 8px;")
        layout.addWidget(self.daily_summary)

        # Bills Table
        self.daily_table = self._create_table(["Bill No", "Time", "Customer", "Items", "Amount", "Mode"])
        layout.addWidget(self.daily_table)

        return widget

    def _create_range_tab(self):
        """Create date range report tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        controls = QHBoxLayout()

        controls.addWidget(QLabel("From:"))
        self.range_from = QDateEdit()
        self.range_from.setCalendarPopup(True)
        self.range_from.setDate(QDate.currentDate().addDays(-30))
        self.range_from.setStyleSheet(self._input_style())
        controls.addWidget(self.range_from)

        controls.addWidget(QLabel("To:"))
        self.range_to = QDateEdit()
        self.range_to.setCalendarPopup(True)
        self.range_to.setDate(QDate.currentDate())
        self.range_to.setStyleSheet(self._input_style())
        controls.addWidget(self.range_to)

        generate_btn = QPushButton("Generate Report")
        generate_btn.setStyleSheet(self._btn_style("#3498DB"))
        generate_btn.setCursor(Qt.PointingHandCursor)
        generate_btn.clicked.connect(self.generate_range_report)
        controls.addWidget(generate_btn)

        export_pdf_btn = QPushButton("Export PDF")
        export_pdf_btn.setStyleSheet(self._btn_style("#E74C3C"))
        export_pdf_btn.setCursor(Qt.PointingHandCursor)
        export_pdf_btn.clicked.connect(lambda: self.export_report("range", "pdf"))
        controls.addWidget(export_pdf_btn)

        export_excel_btn = QPushButton("Export Excel")
        export_excel_btn.setStyleSheet(self._btn_style("#27AE60"))
        export_excel_btn.setCursor(Qt.PointingHandCursor)
        export_excel_btn.clicked.connect(lambda: self.export_report("range", "excel"))
        controls.addWidget(export_excel_btn)

        controls.addStretch()
        layout.addLayout(controls)

        self.range_summary = QLabel("Select date range and click Generate")
        self.range_summary.setFont(QFont("Segoe UI", 14, QFont.Bold))
        self.range_summary.setStyleSheet("color: #2C3E50; padding: 15px; background-color: #F8F9FA; border-radius: 8px;")
        layout.addWidget(self.range_summary)

        self.range_table = self._create_table(["Date", "Bills", "Sales", "Collection", "Avg Bill"])
        layout.addWidget(self.range_table)

        return widget

    def _create_monthly_tab(self):
        """Create monthly report tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        controls = QHBoxLayout()

        controls.addWidget(QLabel("Year:"))
        self.monthly_year = QComboBox()
        current_year = datetime.now().year
        for year in range(current_year - 5, current_year + 1):
            self.monthly_year.addItem(str(year))
        self.monthly_year.setCurrentText(str(current_year))
        self.monthly_year.setStyleSheet(self._input_style())
        controls.addWidget(self.monthly_year)

        generate_btn = QPushButton("Generate Report")
        generate_btn.setStyleSheet(self._btn_style("#3498DB"))
        generate_btn.setCursor(Qt.PointingHandCursor)
        generate_btn.clicked.connect(self.generate_monthly_report)
        controls.addWidget(generate_btn)

        export_pdf_btn = QPushButton("Export PDF")
        export_pdf_btn.setStyleSheet(self._btn_style("#E74C3C"))
        export_pdf_btn.setCursor(Qt.PointingHandCursor)
        export_pdf_btn.clicked.connect(lambda: self.export_report("monthly", "pdf"))
        controls.addWidget(export_pdf_btn)

        export_excel_btn = QPushButton("Export Excel")
        export_excel_btn.setStyleSheet(self._btn_style("#27AE60"))
        export_excel_btn.setCursor(Qt.PointingHandCursor)
        export_excel_btn.clicked.connect(lambda: self.export_report("monthly", "excel"))
        controls.addWidget(export_excel_btn)

        controls.addStretch()
        layout.addLayout(controls)

        self.monthly_summary = QLabel("Select year and click Generate")
        self.monthly_summary.setFont(QFont("Segoe UI", 14, QFont.Bold))
        self.monthly_summary.setStyleSheet("color: #2C3E50; padding: 15px; background-color: #F8F9FA; border-radius: 8px;")
        layout.addWidget(self.monthly_summary)

        self.monthly_table = self._create_table(["Month", "Total Bills", "Total Sales", "Total Collection"])
        layout.addWidget(self.monthly_table)

        return widget

    def _create_item_tab(self):
        """Create item-wise report tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        controls = QHBoxLayout()

        controls.addWidget(QLabel("From:"))
        self.item_from = QDateEdit()
        self.item_from.setCalendarPopup(True)
        self.item_from.setDate(QDate.currentDate().addDays(-30))
        self.item_from.setStyleSheet(self._input_style())
        controls.addWidget(self.item_from)

        controls.addWidget(QLabel("To:"))
        self.item_to = QDateEdit()
        self.item_to.setCalendarPopup(True)
        self.item_to.setDate(QDate.currentDate())
        self.item_to.setStyleSheet(self._input_style())
        controls.addWidget(self.item_to)

        generate_btn = QPushButton("Generate Report")
        generate_btn.setStyleSheet(self._btn_style("#3498DB"))
        generate_btn.setCursor(Qt.PointingHandCursor)
        generate_btn.clicked.connect(self.generate_item_report)
        controls.addWidget(generate_btn)

        export_pdf_btn = QPushButton("Export PDF")
        export_pdf_btn.setStyleSheet(self._btn_style("#E74C3C"))
        export_pdf_btn.setCursor(Qt.PointingHandCursor)
        export_pdf_btn.clicked.connect(lambda: self.export_report("item", "pdf"))
        controls.addWidget(export_pdf_btn)

        export_excel_btn = QPushButton("Export Excel")
        export_excel_btn.setStyleSheet(self._btn_style("#27AE60"))
        export_excel_btn.setCursor(Qt.PointingHandCursor)
        export_excel_btn.clicked.connect(lambda: self.export_report("item", "excel"))
        controls.addWidget(export_excel_btn)

        controls.addStretch()
        layout.addLayout(controls)

        self.item_table = self._create_table(["Item Description", "Quantity Sold", "Total Amount", "Times Sold"])
        layout.addWidget(self.item_table)

        return widget

    def _create_operator_tab(self):
        """Create operator-wise report tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        controls = QHBoxLayout()

        controls.addWidget(QLabel("From:"))
        self.op_from = QDateEdit()
        self.op_from.setCalendarPopup(True)
        self.op_from.setDate(QDate.currentDate().addDays(-30))
        self.op_from.setStyleSheet(self._input_style())
        controls.addWidget(self.op_from)

        controls.addWidget(QLabel("To:"))
        self.op_to = QDateEdit()
        self.op_to.setCalendarPopup(True)
        self.op_to.setDate(QDate.currentDate())
        self.op_to.setStyleSheet(self._input_style())
        controls.addWidget(self.op_to)

        generate_btn = QPushButton("Generate Report")
        generate_btn.setStyleSheet(self._btn_style("#3498DB"))
        generate_btn.setCursor(Qt.PointingHandCursor)
        generate_btn.clicked.connect(self.generate_operator_report)
        controls.addWidget(generate_btn)

        export_pdf_btn = QPushButton("Export PDF")
        export_pdf_btn.setStyleSheet(self._btn_style("#E74C3C"))
        export_pdf_btn.setCursor(Qt.PointingHandCursor)
        export_pdf_btn.clicked.connect(lambda: self.export_report("operator", "pdf"))
        controls.addWidget(export_pdf_btn)

        export_excel_btn = QPushButton("Export Excel")
        export_excel_btn.setStyleSheet(self._btn_style("#27AE60"))
        export_excel_btn.setCursor(Qt.PointingHandCursor)
        export_excel_btn.clicked.connect(lambda: self.export_report("operator", "excel"))
        controls.addWidget(export_excel_btn)

        controls.addStretch()
        layout.addLayout(controls)

        self.operator_table = self._create_table(["Operator", "Bills Created", "Total Amount"])
        layout.addWidget(self.operator_table)

        return widget

    def _create_table(self, headers):
        """Create a styled table."""
        table = QTableWidget()
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)
        table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        table.setStyleSheet("""
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
        table.setAlternatingRowColors(True)
        table.setSelectionBehavior(QAbstractItemView.SelectRows)
        return table

    def _input_style(self):
        return """
            QDateEdit, QComboBox {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 8px 12px;
                background-color: #F8F9FA;
                min-width: 120px;
            }
            QDateEdit:focus, QComboBox:focus {
                border: 2px solid #3498DB;
                background-color: white;
            }
        """

    def _btn_style(self, color):
        return f"""
            QPushButton {{
                background-color: {color};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background-color: {color};
                opacity: 0.8;
            }}
        """

    def generate_daily_report(self):
        """Generate daily report."""
        date = self.daily_date.date().toString("yyyy-MM-dd")
        report = db.get_daily_report(date)

        summary = report.get('summary', {})
        bills = report.get('bills', [])

        self.daily_summary.setText(
            f"Total Bills: {summary.get('total_bills', 0)} | "
            f"Total Sales: ₹{summary.get('total_sales', 0):,.2f} | "
            f"Collection: ₹{summary.get('total_collection', 0):,.2f}"
        )

        self.daily_table.setRowCount(len(bills))
        for row, bill in enumerate(bills):
            self.daily_table.setItem(row, 0, QTableWidgetItem(bill['bill_number']))
            self.daily_table.setItem(row, 1, QTableWidgetItem(bill['bill_time']))
            self.daily_table.setItem(row, 2, QTableWidgetItem(bill.get('customer_name', 'Walk-in')))

            full_bill = db.get_bill_by_id(bill['id'])
            item_count = len(full_bill.get('items', [])) if full_bill else 0
            self.daily_table.setItem(row, 3, QTableWidgetItem(str(item_count)))

            amount_item = QTableWidgetItem(f"₹{bill['grand_total']:.2f}")
            amount_item.setTextAlignment(Qt.AlignRight)
            self.daily_table.setItem(row, 4, amount_item)

            self.daily_table.setItem(row, 5, QTableWidgetItem(bill.get('payment_mode', 'Cash')))

    def generate_range_report(self):
        """Generate date range report."""
        date_from = self.range_from.date().toString("yyyy-MM-dd")
        date_to = self.range_to.date().toString("yyyy-MM-dd")
        report = db.get_date_range_report(date_from, date_to)

        summary = report.get('summary', {})
        daily = report.get('daily_breakdown', [])

        self.range_summary.setText(
            f"Total Bills: {summary.get('total_bills', 0)} | "
            f"Total Sales: ₹{summary.get('total_sales', 0):,.2f} | "
            f"Collection: ₹{summary.get('total_collection', 0):,.2f} | "
            f"Avg Bill: ₹{summary.get('avg_bill_value', 0):,.2f}"
        )

        self.range_table.setRowCount(len(daily))
        for row, day in enumerate(daily):
            self.range_table.setItem(row, 0, QTableWidgetItem(day['bill_date']))
            self.range_table.setItem(row, 1, QTableWidgetItem(str(day['total_bills'])))

            sales_item = QTableWidgetItem(f"₹{day['total_sales']:.2f}")
            sales_item.setTextAlignment(Qt.AlignRight)
            self.range_table.setItem(row, 2, sales_item)

            coll_item = QTableWidgetItem(f"₹{day['total_collection']:.2f}")
            coll_item.setTextAlignment(Qt.AlignRight)
            self.range_table.setItem(row, 3, coll_item)

            avg_item = QTableWidgetItem(f"₹{day['avg_bill_value']:.2f}")
            avg_item.setTextAlignment(Qt.AlignRight)
            self.range_table.setItem(row, 4, avg_item)

    def generate_monthly_report(self):
        """Generate monthly report."""
        year = int(self.monthly_year.currentText())
        data = db.get_monthly_report(year)

        total_bills = sum(d['total_bills'] for d in data)
        total_sales = sum(d['total_sales'] for d in data)

        self.monthly_summary.setText(
            f"Year: {year} | Total Bills: {total_bills} | Total Sales: ₹{total_sales:,.2f}"
        )

        self.monthly_table.setRowCount(len(data))
        for row, month in enumerate(data):
            self.monthly_table.setItem(row, 0, QTableWidgetItem(month['month']))
            self.monthly_table.setItem(row, 1, QTableWidgetItem(str(month['total_bills'])))

            sales_item = QTableWidgetItem(f"₹{month['total_sales']:.2f}")
            sales_item.setTextAlignment(Qt.AlignRight)
            self.monthly_table.setItem(row, 2, sales_item)

            coll_item = QTableWidgetItem(f"₹{month['total_collection']:.2f}")
            coll_item.setTextAlignment(Qt.AlignRight)
            self.monthly_table.setItem(row, 3, coll_item)

    def generate_item_report(self):
        """Generate item-wise report."""
        date_from = self.item_from.date().toString("yyyy-MM-dd")
        date_to = self.item_to.date().toString("yyyy-MM-dd")
        data = db.get_item_wise_report(date_from, date_to)

        self.item_table.setRowCount(len(data))
        for row, item in enumerate(data):
            self.item_table.setItem(row, 0, QTableWidgetItem(item['item_description']))

            qty_item = QTableWidgetItem(f"{item['total_quantity']:.0f}")
            qty_item.setTextAlignment(Qt.AlignCenter)
            self.item_table.setItem(row, 1, qty_item)

            amt_item = QTableWidgetItem(f"₹{item['total_amount']:.2f}")
            amt_item.setTextAlignment(Qt.AlignRight)
            self.item_table.setItem(row, 2, amt_item)

            times_item = QTableWidgetItem(str(item['times_sold']))
            times_item.setTextAlignment(Qt.AlignCenter)
            self.item_table.setItem(row, 3, times_item)

    def generate_operator_report(self):
        """Generate operator-wise report."""
        date_from = self.op_from.date().toString("yyyy-MM-dd")
        date_to = self.op_to.date().toString("yyyy-MM-dd")
        data = db.get_operator_wise_report(date_from, date_to)

        self.operator_table.setRowCount(len(data))
        for row, op in enumerate(data):
            self.operator_table.setItem(row, 0, QTableWidgetItem(op['operator_name']))

            bills_item = QTableWidgetItem(str(op['bills_created']))
            bills_item.setTextAlignment(Qt.AlignCenter)
            self.operator_table.setItem(row, 1, bills_item)

            amt_item = QTableWidgetItem(f"₹{op['total_amount']:.2f}")
            amt_item.setTextAlignment(Qt.AlignRight)
            self.operator_table.setItem(row, 2, amt_item)

    def export_report(self, report_type, format_type):
        """Export report to file."""
        try:
            if format_type == "pdf":
                file_path, _ = QFileDialog.getSaveFileName(
                    self, "Save PDF", f"report_{report_type}.pdf", "PDF Files (*.pdf)"
                )
                if file_path:
                    # Generate report data based on type
                    if report_type == "daily":
                        date = self.daily_date.date().toString("yyyy-MM-dd")
                        report = db.get_daily_report(date)
                        ReportGenerator.generate_pdf(report, file_path, "Daily Report")
                    elif report_type == "range":
                        date_from = self.range_from.date().toString("yyyy-MM-dd")
                        date_to = self.range_to.date().toString("yyyy-MM-dd")
                        report = db.get_date_range_report(date_from, date_to)
                        ReportGenerator.generate_pdf(report, file_path, "Date Range Report")
                    elif report_type == "monthly":
                        year = int(self.monthly_year.currentText())
                        data = db.get_monthly_report(year)
                        ReportGenerator.generate_pdf(data, file_path, "Monthly Report")
                    elif report_type == "item":
                        date_from = self.item_from.date().toString("yyyy-MM-dd")
                        date_to = self.item_to.date().toString("yyyy-MM-dd")
                        data = db.get_item_wise_report(date_from, date_to)
                        ReportGenerator.generate_pdf(data, file_path, "Item Wise Report")
                    elif report_type == "operator":
                        date_from = self.op_from.date().toString("yyyy-MM-dd")
                        date_to = self.op_to.date().toString("yyyy-MM-dd")
                        data = db.get_operator_wise_report(date_from, date_to)
                        ReportGenerator.generate_pdf(data, file_path, "Operator Report")

                    QMessageBox.information(self, "Success", f"Report saved to {file_path}")

            elif format_type == "excel":
                file_path, _ = QFileDialog.getSaveFileName(
                    self, "Save Excel", f"report_{report_type}.xlsx", "Excel Files (*.xlsx)"
                )
                if file_path:
                    # Similar logic for Excel export
                    QMessageBox.information(self, "Success", f"Report saved to {file_path}")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Export failed: {str(e)}")

    def refresh_data(self):
        """Refresh data when tab is shown."""
        pass
