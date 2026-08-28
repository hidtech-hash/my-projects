"""
BillingPro - Settings Widget
============================
Shop settings, printer configuration, and user management.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                               QLineEdit, QPushButton, QFrame, QMessageBox,
                               QTabWidget, QGridLayout, QFileDialog, QCheckBox,
                               QComboBox, QTextEdit, QGroupBox, QScrollArea)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QPixmap

from src.database.db_manager import db
from src.printer.printer_manager import printer_manager


class SettingsWidget(QWidget):
    """Application settings widget."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_settings()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Header
        header = QLabel("Settings")
        header.setFont(QFont("Segoe UI", 22, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        # Tabs
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
        """)

        # Shop Settings Tab
        self.tabs.addTab(self._create_shop_tab(), "Shop Settings")

        # Printer Settings Tab
        self.tabs.addTab(self._create_printer_tab(), "Printer")

        # Users Tab
        self.tabs.addTab(self._create_users_tab(), "Users")

        # Backup Tab
        self.tabs.addTab(self._create_backup_tab(), "Backup")

        layout.addWidget(self.tabs)

    def _create_shop_tab(self):
        """Create shop settings tab."""
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("border: none; background-color: white;")

        widget = QWidget()
        layout = QGridLayout(widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Shop Name
        layout.addWidget(QLabel("Shop Name:"), 0, 0)
        self.shop_name = QLineEdit()
        self.shop_name.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_name, 0, 1)

        # Address
        layout.addWidget(QLabel("Address:"), 1, 0)
        self.shop_address = QLineEdit()
        self.shop_address.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_address, 1, 1)

        # City
        layout.addWidget(QLabel("City:"), 2, 0)
        self.shop_city = QLineEdit()
        self.shop_city.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_city, 2, 1)

        # State
        layout.addWidget(QLabel("State:"), 3, 0)
        self.shop_state = QLineEdit()
        self.shop_state.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_state, 3, 1)

        # Pincode
        layout.addWidget(QLabel("Pincode:"), 4, 0)
        self.shop_pincode = QLineEdit()
        self.shop_pincode.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_pincode, 4, 1)

        # Contact
        layout.addWidget(QLabel("Contact Number:"), 5, 0)
        self.shop_contact = QLineEdit()
        self.shop_contact.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_contact, 5, 1)

        # Email
        layout.addWidget(QLabel("Email:"), 6, 0)
        self.shop_email = QLineEdit()
        self.shop_email.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_email, 6, 1)

        # GST Number
        layout.addWidget(QLabel("GST Number:"), 7, 0)
        self.shop_gst = QLineEdit()
        self.shop_gst.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_gst, 7, 1)

        # UPI ID
        layout.addWidget(QLabel("UPI ID:"), 8, 0)
        self.shop_upi = QLineEdit()
        self.shop_upi.setPlaceholderText("e.g., shopname@upi")
        self.shop_upi.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_upi, 8, 1)

        # Footer Message
        layout.addWidget(QLabel("Footer Message:"), 9, 0)
        self.shop_footer = QLineEdit()
        self.shop_footer.setStyleSheet(self._input_style())
        layout.addWidget(self.shop_footer, 9, 1)

        # Logo
        layout.addWidget(QLabel("Shop Logo:"), 10, 0)
        logo_layout = QHBoxLayout()
        self.logo_path = QLabel("No logo selected")
        self.logo_path.setStyleSheet("color: #7F8C8D;")
        logo_layout.addWidget(self.logo_path)

        logo_btn = QPushButton("Browse...")
        logo_btn.setStyleSheet(self._btn_style("#3498DB"))
        logo_btn.setCursor(Qt.PointingHandCursor)
        logo_btn.clicked.connect(self.browse_logo)
        logo_layout.addWidget(logo_btn)

        self.logo_preview = QLabel()
        self.logo_preview.setFixedSize(100, 100)
        self.logo_preview.setStyleSheet("border: 1px solid #E0E0E0; border-radius: 8px;")
        logo_layout.addWidget(self.logo_preview)
        logo_layout.addStretch()

        layout.addLayout(logo_layout, 10, 1)

        # Save Button
        save_btn = QPushButton("Save Settings")
        save_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        save_btn.setStyleSheet(self._btn_style("#27AE60"))
        save_btn.setCursor(Qt.PointingHandCursor)
        save_btn.setMinimumHeight(50)
        save_btn.clicked.connect(self.save_settings)
        layout.addWidget(save_btn, 11, 0, 1, 2, Qt.AlignCenter)

        layout.setRowStretch(12, 1)

        scroll.setWidget(widget)
        return scroll

    def _create_printer_tab(self):
        """Create printer settings tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Printer Selection
        group = QGroupBox("Printer Configuration")
        group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #E0E0E0;
                border-radius: 10px;
                padding: 20px;
                margin-top: 15px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 15px;
                padding: 0 10px;
            }
        """)
        group_layout = QVBoxLayout(group)

        # Available printers
        printer_layout = QHBoxLayout()
        printer_layout.addWidget(QLabel("Default Printer:"))
        self.printer_combo = QComboBox()
        self.printer_combo.setStyleSheet(self._input_style())
        self.printer_combo.setMinimumWidth(300)

        # Load available printers
        printers = printer_manager.get_available_printers()
        self.printer_combo.addItem("System Default")
        for printer in printers:
            self.printer_combo.addItem(printer)

        printer_layout.addWidget(self.printer_combo)
        printer_layout.addStretch()
        group_layout.addLayout(printer_layout)

        # Thermal printer settings
        thermal_layout = QHBoxLayout()
        thermal_layout.addWidget(QLabel("Thermal Printer:"))
        self.thermal_status = QLabel("Not Connected")
        self.thermal_status.setStyleSheet("color: #E74C3C;")
        thermal_layout.addWidget(self.thermal_status)

        test_btn = QPushButton("Test Print")
        test_btn.setStyleSheet(self._btn_style("#3498DB"))
        test_btn.setCursor(Qt.PointingHandCursor)
        test_btn.clicked.connect(self.test_printer)
        thermal_layout.addWidget(test_btn)
        thermal_layout.addStretch()
        group_layout.addLayout(thermal_layout)

        layout.addWidget(group)
        layout.addStretch()

        return widget

    def _create_users_tab(self):
        """Create user management tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Add User
        add_group = QGroupBox("Add New User")
        add_group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #E0E0E0;
                border-radius: 10px;
                padding: 20px;
                margin-top: 15px;
            }
        """)
        add_layout = QGridLayout(add_group)

        add_layout.addWidget(QLabel("Username:"), 0, 0)
        self.new_username = QLineEdit()
        self.new_username.setStyleSheet(self._input_style())
        add_layout.addWidget(self.new_username, 0, 1)

        add_layout.addWidget(QLabel("Password:"), 1, 0)
        self.new_password = QLineEdit()
        self.new_password.setEchoMode(QLineEdit.Password)
        self.new_password.setStyleSheet(self._input_style())
        add_layout.addWidget(self.new_password, 1, 1)

        add_layout.addWidget(QLabel("Full Name:"), 2, 0)
        self.new_fullname = QLineEdit()
        self.new_fullname.setStyleSheet(self._input_style())
        add_layout.addWidget(self.new_fullname, 2, 1)

        add_layout.addWidget(QLabel("Role:"), 3, 0)
        self.new_role = QComboBox()
        self.new_role.addItems(["operator", "admin"])
        self.new_role.setStyleSheet(self._input_style())
        add_layout.addWidget(self.new_role, 3, 1)

        add_user_btn = QPushButton("Add User")
        add_user_btn.setStyleSheet(self._btn_style("#27AE60"))
        add_user_btn.setCursor(Qt.PointingHandCursor)
        add_user_btn.setMinimumHeight(40)
        add_user_btn.clicked.connect(self.add_user)
        add_layout.addWidget(add_user_btn, 4, 0, 1, 2)

        layout.addWidget(add_group)
        layout.addStretch()

        return widget

    def _create_backup_tab(self):
        """Create backup settings tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Auto Backup
        self.auto_backup_check = QCheckBox("Enable Automatic Daily Backup")
        self.auto_backup_check.setStyleSheet("font-size: 14px;")
        layout.addWidget(self.auto_backup_check)

        # Backup Path
        path_layout = QHBoxLayout()
        path_layout.addWidget(QLabel("Backup Location:"))
        self.backup_path = QLineEdit()
        self.backup_path.setStyleSheet(self._input_style())
        path_layout.addWidget(self.backup_path)

        browse_btn = QPushButton("Browse...")
        browse_btn.setStyleSheet(self._btn_style("#3498DB"))
        browse_btn.setCursor(Qt.PointingHandCursor)
        browse_btn.clicked.connect(self.browse_backup_path)
        path_layout.addWidget(browse_btn)
        layout.addLayout(path_layout)

        # Manual Backup
        backup_btn = QPushButton("Create Backup Now")
        backup_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        backup_btn.setStyleSheet(self._btn_style("#27AE60"))
        backup_btn.setCursor(Qt.PointingHandCursor)
        backup_btn.setMinimumHeight(50)
        backup_btn.clicked.connect(self.create_backup)
        layout.addWidget(backup_btn)

        # Restore
        restore_btn = QPushButton("Restore from Backup")
        restore_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        restore_btn.setStyleSheet(self._btn_style("#E74C3C"))
        restore_btn.setCursor(Qt.PointingHandCursor)
        restore_btn.setMinimumHeight(50)
        restore_btn.clicked.connect(self.restore_backup)
        layout.addWidget(restore_btn)

        layout.addStretch()
        return widget

    def _input_style(self):
        return """
            QLineEdit, QComboBox {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 10px 12px;
                background-color: #F8F9FA;
                min-width: 250px;
            }
            QLineEdit:focus, QComboBox:focus {
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
                padding: 10px 25px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background-color: {color};
                opacity: 0.8;
            }}
        """

    def load_settings(self):
        """Load current settings."""
        settings = db.get_shop_settings()

        self.shop_name.setText(settings.get('shop_name', ''))
        self.shop_address.setText(settings.get('address', ''))
        self.shop_city.setText(settings.get('city', ''))
        self.shop_state.setText(settings.get('state', ''))
        self.shop_pincode.setText(settings.get('pincode', ''))
        self.shop_contact.setText(settings.get('contact_number', ''))
        self.shop_email.setText(settings.get('email', ''))
        self.shop_gst.setText(settings.get('gst_number', ''))
        self.shop_upi.setText(settings.get('upi_id', ''))
        self.shop_footer.setText(settings.get('footer_message', ''))

        logo_path = settings.get('logo_path', '')
        if logo_path and os.path.exists(logo_path):
            self.logo_path.setText(logo_path)
            pixmap = QPixmap(logo_path)
            self.logo_preview.setPixmap(pixmap.scaled(100, 100, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        # Printer
        printer_name = settings.get('printer_name', '')
        if printer_name:
            index = self.printer_combo.findText(printer_name)
            if index >= 0:
                self.printer_combo.setCurrentIndex(index)

        # Backup
        self.auto_backup_check.setChecked(bool(settings.get('auto_backup', 1)))
        self.backup_path.setText(settings.get('backup_path', ''))

    def save_settings(self):
        """Save shop settings."""
        settings = {
            'shop_name': self.shop_name.text(),
            'address': self.shop_address.text(),
            'city': self.shop_city.text(),
            'state': self.shop_state.text(),
            'pincode': self.shop_pincode.text(),
            'contact_number': self.shop_contact.text(),
            'email': self.shop_email.text(),
            'gst_number': self.shop_gst.text(),
            'upi_id': self.shop_upi.text(),
            'footer_message': self.shop_footer.text(),
            'logo_path': self.logo_path.text() if self.logo_path.text() != "No logo selected" else '',
            'printer_name': self.printer_combo.currentText() if self.printer_combo.currentText() != "System Default" else '',
            'auto_backup': 1 if self.auto_backup_check.isChecked() else 0,
            'backup_path': self.backup_path.text()
        }

        try:
            db.update_shop_settings(settings)
            QMessageBox.information(self, "Success", "Settings saved successfully!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save settings: {str(e)}")

    def browse_logo(self):
        """Browse for logo file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Logo", "", "Images (*.png *.jpg *.jpeg *.bmp)"
        )
        if file_path:
            self.logo_path.setText(file_path)
            pixmap = QPixmap(file_path)
            self.logo_preview.setPixmap(pixmap.scaled(100, 100, Qt.KeepAspectRatio, Qt.SmoothTransformation))

    def browse_backup_path(self):
        """Browse for backup directory."""
        dir_path = QFileDialog.getExistingDirectory(self, "Select Backup Directory")
        if dir_path:
            self.backup_path.setText(dir_path)

    def test_printer(self):
        """Test printer connection."""
        try:
            if printer_manager.thermal.print_test_page():
                self.thermal_status.setText("Connected")
                self.thermal_status.setStyleSheet("color: #27AE60;")
                QMessageBox.information(self, "Success", "Test page printed successfully!")
            else:
                self.thermal_status.setText("Not Connected")
                self.thermal_status.setStyleSheet("color: #E74C3C;")
                QMessageBox.warning(self, "Error", "Could not connect to thermal printer.")
        except Exception as e:
            QMessageBox.warning(self, "Error", f"Printer error: {str(e)}")

    def add_user(self):
        """Add a new user."""
        username = self.new_username.text().strip()
        password = self.new_password.text()
        full_name = self.new_fullname.text().strip()
        role = self.new_role.currentText()

        if not all([username, password, full_name]):
            QMessageBox.warning(self, "Error", "Please fill all fields.")
            return

        main_window = self.window()
        created_by = main_window.current_user['id'] if hasattr(main_window, 'current_user') else 1

        try:
            db.create_user(username, password, full_name, role, created_by)
            QMessageBox.information(self, "Success", f"User '{username}' created successfully!")
            self.new_username.clear()
            self.new_password.clear()
            self.new_fullname.clear()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to create user: {str(e)}")

    def create_backup(self):
        """Create manual backup."""
        try:
            backup_path = db.create_backup()
            QMessageBox.information(self, "Success", f"Backup created at:
{backup_path}")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Backup failed: {str(e)}")

    def restore_backup(self):
        """Restore from backup."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Backup File", "", "Database Files (*.db)"
        )
        if file_path:
            reply = QMessageBox.question(
                self, "Confirm Restore",
                "This will replace all current data. Are you sure?",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply == QMessageBox.Yes:
                try:
                    db.restore_backup(file_path)
                    QMessageBox.information(self, "Success", "Database restored successfully!\nPlease restart the application.")
                except Exception as e:
                    QMessageBox.critical(self, "Error", f"Restore failed: {str(e)}")

    def refresh_data(self):
        """Refresh data when tab is shown."""
        self.load_settings()
