"""
BillingPro - Dashboard Widget
=============================
Main dashboard with sales overview.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                               QFrame, QGridLayout, QPushButton, QSpacerItem,
                               QSizePolicy)
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QFont

from src.database.db_manager import db
from src.config import AppConfig


class StatCard(QFrame):
    """Dashboard statistic card."""

    def __init__(self, title, value, color, parent=None):
        super().__init__(parent)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {color};
                border-radius: 12px;
                padding: 20px;
            }}
        """)
        self.setMinimumHeight(140)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)

        self.title_label = QLabel(title)
        self.title_label.setFont(QFont("Segoe UI", 11))
        self.title_label.setStyleSheet("color: rgba(255,255,255,0.8);")
        layout.addWidget(self.title_label)

        self.value_label = QLabel(str(value))
        self.value_label.setFont(QFont("Segoe UI", 28, QFont.Bold))
        self.value_label.setStyleSheet("color: white;")
        layout.addWidget(self.value_label)

        layout.addStretch()

    def set_value(self, value):
        self.value_label.setText(str(value))


class DashboardWidget(QWidget):
    """Main dashboard widget."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()

        # Auto refresh timer
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.refresh_data)
        self.timer.start(30000)  # Refresh every 30 seconds

    def setup_ui(self):
        """Setup dashboard UI."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header
        header = QLabel("Dashboard")
        header.setFont(QFont("Segoe UI", 24, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        date_label = QLabel()
        date_label.setFont(QFont("Segoe UI", 12))
        date_label.setStyleSheet("color: #7F8C8D;")
        from datetime import datetime
        date_label.setText(datetime.now().strftime("%A, %d %B %Y"))
        layout.addWidget(date_label)

        layout.addSpacing(10)

        # Stats Grid
        stats_grid = QGridLayout()
        stats_grid.setSpacing(20)

        self.stat_cards = {
            'total_bills': StatCard("Today's Bills", "0", "#3498DB"),
            'total_sales': StatCard("Today's Sales", "₹0", "#27AE60"),
            'total_collection': StatCard("Collection", "₹0", "#F39C12"),
            'avg_bill': StatCard("Avg Bill Value", "₹0", "#9B59B6"),
        }

        positions = [(0, 0), (0, 1), (0, 2), (0, 3)]
        for (key, card), (row, col) in zip(self.stat_cards.items(), positions):
            stats_grid.addWidget(card, row, col)

        layout.addLayout(stats_grid)

        # Quick Actions
        layout.addSpacing(30)
        actions_header = QLabel("Quick Actions")
        actions_header.setFont(QFont("Segoe UI", 16, QFont.Bold))
        actions_header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(actions_header)

        actions_layout = QHBoxLayout()
        actions_layout.setSpacing(15)

        # New Bill button
        self.new_bill_btn = QPushButton("+ New Bill")
        self.new_bill_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.new_bill_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 20px 40px;
            }
            QPushButton:hover {
                background-color: #2980B9;
            }
        """)
        self.new_bill_btn.setCursor(Qt.PointingHandCursor)
        self.new_bill_btn.setMinimumHeight(60)
        actions_layout.addWidget(self.new_bill_btn)

        # Search Bill button
        self.search_btn = QPushButton("Search Bills")
        self.search_btn.setFont(QFont("Segoe UI", 12))
        self.search_btn.setStyleSheet("""
            QPushButton {
                background-color: #FFFFFF;
                color: #2C3E50;
                border: 2px solid #E0E0E0;
                border-radius: 10px;
                padding: 20px 40px;
            }
            QPushButton:hover {
                background-color: #F8F9FA;
                border: 2px solid #3498DB;
            }
        """)
        self.search_btn.setCursor(Qt.PointingHandCursor)
        self.search_btn.setMinimumHeight(60)
        actions_layout.addWidget(self.search_btn)

        # Reports button
        self.reports_btn = QPushButton("View Reports")
        self.reports_btn.setFont(QFont("Segoe UI", 12))
        self.reports_btn.setStyleSheet("""
            QPushButton {
                background-color: #FFFFFF;
                color: #2C3E50;
                border: 2px solid #E0E0E0;
                border-radius: 10px;
                padding: 20px 40px;
            }
            QPushButton:hover {
                background-color: #F8F9FA;
                border: 2px solid #3498DB;
            }
        """)
        self.reports_btn.setCursor(Qt.PointingHandCursor)
        self.reports_btn.setMinimumHeight(60)
        actions_layout.addWidget(self.reports_btn)

        actions_layout.addStretch()
        layout.addLayout(actions_layout)

        layout.addStretch()

        # Status bar
        status = QLabel("System Ready | Offline Mode | Auto-backup Enabled")
        status.setFont(QFont("Segoe UI", 9))
        status.setStyleSheet("color: #95A5A6;")
        layout.addWidget(status)

    def refresh_data(self):
        """Refresh dashboard statistics."""
        try:
            stats = db.get_today_stats()

            self.stat_cards['total_bills'].set_value(str(int(stats.get('total_bills', 0))))
            self.stat_cards['total_sales'].set_value(f"₹{stats.get('total_sales', 0):,.2f}")
            self.stat_cards['total_collection'].set_value(f"₹{stats.get('total_collection', 0):,.2f}")

            avg = stats.get('avg_bill_value', 0)
            self.stat_cards['avg_bill'].set_value(f"₹{avg:,.2f}")
        except Exception as e:
            print(f"Dashboard refresh error: {e}")
