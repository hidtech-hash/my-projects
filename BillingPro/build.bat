@echo off
REM BillingPro Build Script for Windows
REM ===================================

echo ==========================================
echo BillingPro - Windows Build Script
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo Installing dependencies...
pip install -r requirements.txt

REM Create executable
echo Building executable...
pyinstaller --clean BillingPro.spec

echo.
echo ==========================================
echo Build Complete!
echo Executable: dist\BillingPro.exe
echo ==========================================
pause
