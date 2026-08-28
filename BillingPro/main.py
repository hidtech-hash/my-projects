"""
BillingPro - Main Application Entry Point
=========================================
Windows Desktop Billing Software
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                               QHBoxLayout, QStackedWidget, QLabel, QPushButton,
                               QLineEdit, QMessageBox, QFrame, QGraphicsDropShadowEffect)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QFont, QIcon, QColor

from src.config import AppConfig
from src.database.db_manager import db
from src.ui.login_window import LoginWindow
from src.ui.dashboard import DashboardWidget
from src.ui.billing_widget import BillingWidget
from src.ui.history_widget import HistoryWidget
from src.ui.reports_widget import ReportsWidget
from src.ui.settings_widget import SettingsWidget
from src.ui.backup_widget import BackupWidget


class SidebarButton(QPushButton):
    """Custom sidebar navigation button."""

    def __init__(self, text, icon_text, parent=None):
        super().__init__(text, parent)
        self.setMinimumHeight(50)
        self.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.setCursor(Qt.PointingHandCursor)
        self.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #BDC3C7;
                border: none;
                border-left: 4px solid transparent;
                padding-left: 20px;
                text-align: left;
            }
            QPushButton:hover {
                background-color: #34495E;
                color: #FFFFFF;
                border-left: 4px solid #3498DB;
            }
            QPushButton:checked {
                background-color: #34495E;
                color: #FFFFFF;
                border-left: 4px solid #3498DB;
            }
        """)
        self.setCheckable(True)


class MainWindow(QMainWindow):
    """Main application window."""

    def __init__(self):
        super().__init__()
        self.current_user = None
        self.setup_ui()
        self.show_login()

    def setup_ui(self):
        """Setup main window UI."""
        self.setWindowTitle(AppConfig.WINDOW_TITLE)
        self.setMinimumSize(AppConfig.WINDOW_MIN_WIDTH, AppConfig.WINDOW_MIN_HEIGHT)
        self.setStyleSheet("background-color: #F5F6FA;")

        # Central widget
        central = QWidget()
        self.setCentralWidget(central)

        # Main layout
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Sidebar
        self.sidebar = QFrame()
        self.sidebar.setFixedWidth(250)
        self.sidebar.setStyleSheet("background-color: #2C3E50;")
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(0, 0, 0, 0)
        sidebar_layout.setSpacing(0)

        # Logo / App Name
        logo_label = QLabel("BILLINGPRO")
        logo_label.setFont(QFont("Segoe UI", 20, QFont.Bold))
        logo_label.setStyleSheet("color: #FFFFFF; padding: 30px 20px;")
        logo_label.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(logo_label)

        # Version
        version_label = QLabel(f"v{AppConfig.APP_VERSION}")
        version_label.setFont(QFont("Segoe UI", 9))
        version_label.setStyleSheet("color: #7F8C8D; padding-bottom: 20px;")
        version_label.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(version_label)

        # Navigation buttons
        self.nav_buttons = []

        nav_items = [
            ("Dashboard", "dashboard"),
            ("New Bill", "billing"),
            ("Bill History", "history"),
            ("Reports", "reports"),
            ("Settings", "settings"),
            ("Backup", "backup"),
        ]

        for text, page_id in nav_items:
            btn = SidebarButton(text, "")
            btn.clicked.connect(lambda checked, pid=page_id: self.navigate_to(pid))
            sidebar_layout.addWidget(btn)
            self.nav_buttons.append((btn, page_id))

        sidebar_layout.addStretch()

        # User info
        self.user_label = QLabel("Not logged in")
        self.user_label.setFont(QFont("Segoe UI", 10))
        self.user_label.setStyleSheet("color: #BDC3C7; padding: 15px 20px;")
        sidebar_layout.addWidget(self.user_label)

        # Logout button
        logout_btn = QPushButton("Logout")
        logout_btn.setMinimumHeight(40)
        logout_btn.setFont(QFont("Segoe UI", 11))
        logout_btn.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                padding: 10px;
            }
            QPushButton:hover {
                background-color: #C0392B;
            }
        """)
        logout_btn.setCursor(Qt.PointingHandCursor)
        logout_btn.clicked.connect(self.logout)
        sidebar_layout.addWidget(logout_btn)

        main_layout.addWidget(self.sidebar)

        # Content area
        self.content_stack = QStackedWidget()
        self.content_stack.setStyleSheet("background-color: #F5F6FA;")

        # Initialize pages
        self.pages = {}

        self.pages['dashboard'] = DashboardWidget()
        self.pages['billing'] = BillingWidget()
        self.pages['history'] = HistoryWidget()
        self.pages['reports'] = ReportsWidget()
        self.pages['settings'] = SettingsWidget()
        self.pages['backup'] = BackupWidget()

        for page_id, page_widget in self.pages.items():
            self.content_stack.addWidget(page_widget)

        main_layout.addWidget(self.content_stack, 1)

        # Initially hide sidebar
        self.sidebar.hide()
        self.content_stack.hide()

    def show_login(self):
        """Show login dialog."""
        self.login_window = LoginWindow(self)
        self.login_window.login_successful.connect(self.on_login_success)
        self.login_window.show()

    def on_login_success(self, user_data):
        """Handle successful login."""
        self.current_user = user_data
        self.user_label.setText(f"Welcome, {user_data['full_name']}")

        self.login_window.close()
        self.sidebar.show()
        self.content_stack.show()

        # Show dashboard by default
        self.navigate_to('dashboard')
        self.pages['dashboard'].refresh_data()

    def navigate_to(self, page_id):
        """Navigate to a specific page."""
        # Update button states
        for btn, pid in self.nav_buttons:
            btn.setChecked(pid == page_id)

        # Show page
        if page_id in self.pages:
            self.content_stack.setCurrentWidget(self.pages[page_id])
            # Refresh data if needed
            if hasattr(self.pages[page_id], 'refresh_data'):
                self.pages[page_id].refresh_data()

    def logout(self):
        """Logout current user."""
        reply = QMessageBox.question(
            self, "Logout",
            "Are you sure you want to logout?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            self.current_user = None
            self.sidebar.hide()
            self.content_stack.hide()
            self.show_login()

    def closeEvent(self, event):
        """Handle application close."""
        reply = QMessageBox.question(
            self, "Exit",
            "Are you sure you want to exit BillingPro?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            # Auto backup if enabled
            settings = db.get_shop_settings()
            if settings.get('auto_backup', 1):
                try:
                    db.create_backup()
                except:
                    pass
            event.accept()
        else:
            event.ignore()


def main():
    """Application entry point."""
    # Enable high DPI scaling
    os.environ["QT_ENABLE_HIGHDPI_SCALING"] = "1"
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"

    app = QApplication(sys.argv)
    app.setStyle("Fusion")

    # Set application font
    font = QFont("Segoe UI", 10)
    app.setFont(font)

    # Create and show main window
    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
