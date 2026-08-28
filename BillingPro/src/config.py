"""
BillingPro - Configuration Module
=================================
Central configuration management for the billing application.
"""

import os
import json
from pathlib import Path

class AppConfig:
    """Application configuration singleton."""

    # Application Info
    APP_NAME = "BillingPro"
    APP_VERSION = "1.0.0"
    APP_AUTHOR = "BillingPro Team"

    # Directory Paths
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "database"
    ASSETS_DIR = BASE_DIR / "assets"
    LOGO_DIR = ASSETS_DIR / "logo"
    ICONS_DIR = ASSETS_DIR / "icons"
    BACKUP_DIR = BASE_DIR / "backups"
    TEMP_DIR = BASE_DIR / "temp"

    # Database
    DB_NAME = "billingpro.db"
    DB_PATH = DATA_DIR / DB_NAME
    SCHEMA_PATH = DATA_DIR / "schema.sql"

    # UI Settings
    WINDOW_MIN_WIDTH = 1280
    WINDOW_MIN_HEIGHT = 720
    WINDOW_TITLE = f"{APP_NAME} v{APP_VERSION}"

    # Receipt Settings
    THERMAL_PRINTER_WIDTH = 48  # Characters for 58mm printer
    A4_PRINTER_WIDTH = 80       # Characters for A4

    # UPI QR Settings
    UPI_QR_SIZE = 200  # pixels

    # Auto Backup
    AUTO_BACKUP_ENABLED = True
    AUTO_BACKUP_INTERVAL_HOURS = 24
    MAX_BACKUP_FILES = 30

    # Theme
    PRIMARY_COLOR = "#2C3E50"
    SECONDARY_COLOR = "#3498DB"
    SUCCESS_COLOR = "#27AE60"
    WARNING_COLOR = "#F39C12"
    DANGER_COLOR = "#E74C3C"
    BG_COLOR = "#F5F6FA"
    CARD_BG = "#FFFFFF"
    TEXT_COLOR = "#2C3E50"

    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist."""
        for directory in [cls.DATA_DIR, cls.ASSETS_DIR, cls.LOGO_DIR, 
                         cls.ICONS_DIR, cls.BACKUP_DIR, cls.TEMP_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    @classmethod
    def load_settings(cls):
        """Load settings from database."""
        # Will be implemented in database module
        pass

# Initialize directories
AppConfig.ensure_directories()
