"""
BillingPro - Login Window
=========================
User authentication interface.
"""

from PySide6.QtWidgets import (QDialog, QWidget, QVBoxLayout, QHBoxLayout,
                               QLabel, QLineEdit, QPushButton, QMessageBox,
                               QFrame, QGraphicsDropShadowEffect)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont, QIcon

from src.database.db_manager import db


class LoginWindow(QDialog):
    """Login dialog for user authentication."""

    login_successful = Signal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("BillingPro - Login")
        self.setFixedSize(450, 550)
        self.setWindowFlags(Qt.Dialog | Qt.FramelessWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground)

        self.setup_ui()

    def setup_ui(self):
        """Setup login UI."""
        # Main layout
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)

        # Card frame
        card = QFrame()
        card.setStyleSheet("""
            QFrame {
                background-color: #FFFFFF;
                border-radius: 15px;
            }
        """)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(40, 40, 40, 40)
        card_layout.setSpacing(20)

        # Shadow effect
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(30)
        shadow.setColor(Qt.black)
        shadow.setOffset(0, 5)
        card.setGraphicsEffect(shadow)

        # App Name
        title = QLabel("BILLINGPRO")
        title.setFont(QFont("Segoe UI", 28, QFont.Bold))
        title.setStyleSheet("color: #2C3E50;")
        title.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(title)

        # Subtitle
        subtitle = QLabel("Billing Software for Retail Shops")
        subtitle.setFont(QFont("Segoe UI", 11))
        subtitle.setStyleSheet("color: #7F8C8D;")
        subtitle.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(subtitle)

        card_layout.addSpacing(30)

        # Username
        username_label = QLabel("Username")
        username_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        username_label.setStyleSheet("color: #2C3E50;")
        card_layout.addWidget(username_label)

        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("Enter username")
        self.username_input.setFont(QFont("Segoe UI", 11))
        self.username_input.setStyleSheet("""
            QLineEdit {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 12px 15px;
                background-color: #F8F9FA;
                color: #2C3E50;
            }
            QLineEdit:focus {
                border: 2px solid #3498DB;
                background-color: #FFFFFF;
            }
        """)
        self.username_input.setMinimumHeight(45)
        card_layout.addWidget(self.username_input)

        # Password
        password_label = QLabel("Password")
        password_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        password_label.setStyleSheet("color: #2C3E50;")
        card_layout.addWidget(password_label)

        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Enter password")
        self.password_input.setEchoMode(QLineEdit.Password)
        self.password_input.setFont(QFont("Segoe UI", 11))
        self.password_input.setStyleSheet("""
            QLineEdit {
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                padding: 12px 15px;
                background-color: #F8F9FA;
                color: #2C3E50;
            }
            QLineEdit:focus {
                border: 2px solid #3498DB;
                background-color: #FFFFFF;
            }
        """)
        self.password_input.setMinimumHeight(45)
        card_layout.addWidget(self.password_input)

        card_layout.addSpacing(20)

        # Login Button
        self.login_btn = QPushButton("LOGIN")
        self.login_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.login_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
            }
            QPushButton:hover {
                background-color: #2980B9;
            }
            QPushButton:pressed {
                background-color: #21618C;
            }
        """)
        self.login_btn.setCursor(Qt.PointingHandCursor)
        self.login_btn.setMinimumHeight(50)
        self.login_btn.clicked.connect(self.attempt_login)
        card_layout.addWidget(self.login_btn)

        # Default credentials hint
        hint = QLabel("Default: admin/admin123 or operator/operator123")
        hint.setFont(QFont("Segoe UI", 9))
        hint.setStyleSheet("color: #95A5A6;")
        hint.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(hint)

        # Exit button
        exit_btn = QPushButton("Exit")
        exit_btn.setFont(QFont("Segoe UI", 10))
        exit_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #E74C3C;
                border: 1px solid #E74C3C;
                border-radius: 8px;
                padding: 10px;
            }
            QPushButton:hover {
                background-color: #E74C3C;
                color: white;
            }
        """)
        exit_btn.setCursor(Qt.PointingHandCursor)
        exit_btn.clicked.connect(self.close)
        card_layout.addWidget(exit_btn)

        main_layout.addWidget(card, alignment=Qt.AlignCenter)

        # Connect enter key
        self.password_input.returnPressed.connect(self.attempt_login)
        self.username_input.returnPressed.connect(self.password_input.setFocus)

    def attempt_login(self):
        """Attempt user login."""
        username = self.username_input.text().strip()
        password = self.password_input.text().strip()

        if not username or not password:
            QMessageBox.warning(self, "Error", "Please enter both username and password.")
            return

        user = db.authenticate_user(username, password)

        if user:
            self.login_successful.emit(user)
        else:
            QMessageBox.critical(self, "Login Failed", 
                               "Invalid username or password.")
            self.password_input.clear()
            self.password_input.setFocus()

    def mousePressEvent(self, event):
        """Enable window dragging."""
        self.dragPos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        """Handle window drag."""
        if event.buttons() == Qt.LeftButton:
            self.move(self.pos() + event.globalPosition().toPoint() - self.dragPos)
            self.dragPos = event.globalPosition().toPoint()
