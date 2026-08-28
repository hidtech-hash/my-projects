"""
BillingPro - Backup Widget
==========================
Backup and restore management interface.
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QFrame, QMessageBox, QFileDialog,
                               QAbstractItemView)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

from src.database.db_manager import db


class BackupWidget(QWidget):
    """Backup management widget."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_backups()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Header
        header = QLabel("Backup & Restore")
        header.setFont(QFont("Segoe UI", 22, QFont.Bold))
        header.setStyleSheet("color: #2C3E50;")
        layout.addWidget(header)

        subtitle = QLabel("Manage your database backups and restore points")
        subtitle.setFont(QFont("Segoe UI", 11))
        subtitle.setStyleSheet("color: #7F8C8D;")
        layout.addWidget(subtitle)

        layout.addSpacing(10)

        # Action Buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(15)

        self.backup_btn = QPushButton("Create Backup Now")
        self.backup_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.backup_btn.setStyleSheet("""
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
        self.backup_btn.setCursor(Qt.PointingHandCursor)
        self.backup_btn.setMinimumHeight(55)
        self.backup_btn.clicked.connect(self.create_backup)
        btn_layout.addWidget(self.backup_btn)

        self.restore_btn = QPushButton("Restore from File")
        self.restore_btn.setFont(QFont("Segoe UI", 12, QFont.Bold))
        self.restore_btn.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 30px;
            }
            QPushButton:hover {
                background-color: #C0392B;
            }
        """)
        self.restore_btn.setCursor(Qt.PointingHandCursor)
        self.restore_btn.setMinimumHeight(55)
        self.restore_btn.clicked.connect(self.restore_from_file)
        btn_layout.addWidget(self.restore_btn)

        self.refresh_btn = QPushButton("Refresh List")
        self.refresh_btn.setFont(QFont("Segoe UI", 12))
        self.refresh_btn.setStyleSheet("""
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
        self.refresh_btn.setCursor(Qt.PointingHandCursor)
        self.refresh_btn.setMinimumHeight(55)
        self.refresh_btn.clicked.connect(self.load_backups)
        btn_layout.addWidget(self.refresh_btn)

        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        # Info Card
        info_card = QFrame()
        info_card.setStyleSheet("""
            QFrame {
                background-color: #EBF5FB;
                border-radius: 10px;
                border: 1px solid #AED6F1;
                padding: 15px;
            }
        """)
        info_layout = QVBoxLayout(info_card)
        info_label = QLabel("Auto-backup is enabled. Backups are created automatically every 24 hours. "
                            "Keep at least 30 days of backups for safety.")
        info_label.setWordWrap(True)
        info_label.setStyleSheet("color: #2C3E50;")
        info_layout.addWidget(info_label)
        layout.addWidget(info_card)

        # Backups Table
        self.backups_table = QTableWidget()
        self.backups_table.setColumnCount(5)
        self.backups_table.setHorizontalHeaderLabels(["#", "Filename", "Created", "Size", "Actions"])
        self.backups_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.backups_table.setColumnWidth(0, 40)
        self.backups_table.setColumnWidth(2, 150)
        self.backups_table.setColumnWidth(3, 100)
        self.backups_table.setColumnWidth(4, 200)
        self.backups_table.setStyleSheet("""
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
        self.backups_table.setAlternatingRowColors(True)
        self.backups_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        layout.addWidget(self.backups_table)

        # Status
        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet("color: #7F8C8D;")
        layout.addWidget(self.status_label)

    def load_backups(self):
        """Load backup list."""
        backups = db.list_backups()

        self.backups_table.setRowCount(len(backups))

        for row, backup in enumerate(backups):
            self.backups_table.setItem(row, 0, QTableWidgetItem(str(row + 1)))
            self.backups_table.setItem(row, 1, QTableWidgetItem(backup['filename']))
            self.backups_table.setItem(row, 2, QTableWidgetItem(backup['created']))

            # Format size
            size = backup['size']
            if size < 1024:
                size_str = f"{size} B"
            elif size < 1024 * 1024:
                size_str = f"{size / 1024:.1f} KB"
            else:
                size_str = f"{size / (1024 * 1024):.1f} MB"

            size_item = QTableWidgetItem(size_str)
            size_item.setTextAlignment(Qt.AlignCenter)
            self.backups_table.setItem(row, 3, size_item)

            # Action buttons
            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(5, 2, 5, 2)
            action_layout.setSpacing(5)

            restore_btn = QPushButton("Restore")
            restore_btn.setStyleSheet("""
                QPushButton {
                    background-color: #E74C3C;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 10px;
                }
                QPushButton:hover { background-color: #C0392B; }
            """)
            restore_btn.clicked.connect(lambda checked, p=backup['path']: self.restore_backup(p))
            action_layout.addWidget(restore_btn)

            delete_btn = QPushButton("Delete")
            delete_btn.setStyleSheet("""
                QPushButton {
                    background-color: #95A5A6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 10px;
                }
                QPushButton:hover { background-color: #7F8C8D; }
            """)
            delete_btn.clicked.connect(lambda checked, p=backup['path']: self.delete_backup(p))
            action_layout.addWidget(delete_btn)

            action_layout.addStretch()
            self.backups_table.setCellWidget(row, 4, action_widget)

        self.status_label.setText(f"{len(backups)} backup(s) available")

    def create_backup(self):
        """Create a new backup."""
        try:
            backup_path = db.create_backup()
            self.status_label.setText(f"Backup created: {backup_path}")
            QMessageBox.information(self, "Success", f"Backup created successfully!

{backup_path}")
            self.load_backups()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Backup failed: {str(e)}")

    def restore_backup(self, backup_path):
        """Restore from a backup file."""
        reply = QMessageBox.question(
            self, "Confirm Restore",
            "This will replace all current data with the backup.
"
            "Are you sure you want to continue?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            try:
                db.restore_backup(backup_path)
                QMessageBox.information(
                    self, "Success",
                    "Database restored successfully!

"
                    "Please restart the application for changes to take effect."
                )
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Restore failed: {str(e)}")

    def restore_from_file(self):
        """Restore from an external backup file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Backup File", "", "Database Files (*.db)"
        )
        if file_path:
            self.restore_backup(file_path)

    def delete_backup(self, backup_path):
        """Delete a backup file."""
        reply = QMessageBox.question(
            self, "Confirm Delete",
            "Are you sure you want to delete this backup?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            try:
                import os
                os.remove(backup_path)
                self.load_backups()
                QMessageBox.information(self, "Deleted", "Backup deleted successfully.")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Delete failed: {str(e)}")

    def refresh_data(self):
        """Refresh data when tab is shown."""
        self.load_backups()
