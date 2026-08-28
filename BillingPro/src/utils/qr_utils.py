"""
BillingPro - QR Code Utilities
==============================
Handles UPI QR code generation for payment integration.
"""

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont
import os
from datetime import datetime
from pathlib import Path

from src.config import AppConfig


class QRCodeGenerator:
    """Generate UPI QR codes for payment."""

    @staticmethod
    def generate_upi_qr(upi_id: str, amount: float, payee_name: str = "",
                        transaction_note: str = "Bill Payment") -> str:
        """
        Generate UPI QR code for payment.

        Args:
            upi_id: UPI ID (e.g., shopname@upi)
            amount: Payment amount
            payee_name: Name of the payee (shop name)
            transaction_note: Transaction description

        Returns:
            Path to generated QR code image
        """
        # Build UPI payment URI
        # Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&am=AMOUNT&tn=NOTE
        upi_uri = f"upi://pay?pa={upi_id}&pn={payee_name}&am={amount:.2f}&tn={transaction_note}&cu=INR"

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(upi_uri)
        qr.make(fit=True)

        # Create styled image
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            fill_color="#2C3E50",
            back_color="white"
        )

        # Resize to standard size
        img = img.resize((AppConfig.UPI_QR_SIZE, AppConfig.UPI_QR_SIZE))

        # Add label at bottom
        final_img = Image.new('RGB', (AppConfig.UPI_QR_SIZE, AppConfig.UPI_QR_SIZE + 30), 'white')
        final_img.paste(img, (0, 0))

        # Add amount text
        draw = ImageDraw.Draw(final_img)
        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except:
            font = ImageFont.load_default()

        text = f"Scan & Pay: ₹{amount:.2f}"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (AppConfig.UPI_QR_SIZE - text_width) // 2
        draw.text((text_x, AppConfig.UPI_QR_SIZE + 5), text, fill="#2C3E50", font=font)

        # Save to temp directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"upi_qr_{timestamp}.png"
        filepath = AppConfig.TEMP_DIR / filename

        final_img.save(filepath, quality=95)
        return str(filepath)

    @staticmethod
    def generate_static_qr(upi_id: str, payee_name: str = "") -> str:
        """Generate static UPI QR (without amount - customer enters amount)."""
        upi_uri = f"upi://pay?pa={upi_id}&pn={payee_name}&cu=INR"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(upi_uri)
        qr.make(fit=True)

        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            fill_color="#2C3E50",
            back_color="white"
        )

        img = img.resize((AppConfig.UPI_QR_SIZE, AppConfig.UPI_QR_SIZE))

        final_img = Image.new('RGB', (AppConfig.UPI_QR_SIZE, AppConfig.UPI_QR_SIZE + 30), 'white')
        final_img.paste(img, (0, 0))

        draw = ImageDraw.Draw(final_img)
        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except:
            font = ImageFont.load_default()

        text = "Scan & Pay"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (AppConfig.UPI_QR_SIZE - text_width) // 2
        draw.text((text_x, AppConfig.UPI_QR_SIZE + 5), text, fill="#2C3E50", font=font)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"upi_qr_static_{timestamp}.png"
        filepath = AppConfig.TEMP_DIR / filename

        final_img.save(filepath, quality=95)
        return str(filepath)

    @staticmethod
    def cleanup_old_qr_files():
        """Remove QR files older than 24 hours."""
        cutoff = datetime.now().timestamp() - 86400
        for file in AppConfig.TEMP_DIR.glob("upi_qr_*.png"):
            if file.stat().st_mtime < cutoff:
                file.unlink()


# Convenience function
def get_upi_qr_for_bill(upi_id: str, amount: float, shop_name: str = "") -> str:
    """Quick function to get QR code for a bill."""
    return QRCodeGenerator.generate_upi_qr(upi_id, amount, shop_name)
