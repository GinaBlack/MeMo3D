@echo off
SETLOCAL

REM ─────────────────────────────────────────────────────────────────────────────
REM  run.bat  -  Set up and start the DICOM AI Service on Windows
REM  Usage:  run.bat
REM ─────────────────────────────────────────────────────────────────────────────

SET VENV_DIR=.venv

echo.
echo ============================================================
echo   DICOM CT Scan AI Service - Windows Setup
echo ============================================================
echo.

REM ── Check Python ─────────────────────────────────────────────────────────────
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Python not found. Please install Python 3.10-3.12
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

REM ── Create venv ──────────────────────────────────────────────────────────────
IF NOT EXIST "%VENV_DIR%" (
    echo Creating virtual environment ...
    python -m venv %VENV_DIR%
    IF ERRORLEVEL 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created.
    echo.
)

REM ── Activate ─────────────────────────────────────────────────────────────────
CALL %VENV_DIR%\Scripts\activate.bat
IF ERRORLEVEL 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM ── Upgrade pip ──────────────────────────────────────────────────────────────
echo Upgrading pip ...
python -m pip install --upgrade pip --quiet

REM ── Install PyTorch (CPU) ─────────────────────────────────────────────────
echo.
echo Installing PyTorch (CPU build) ...
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet
IF ERRORLEVEL 1 (
    echo WARNING: PyTorch install failed - continuing anyway
)

REM ── Install all other dependencies ───────────────────────────────────────────
echo Installing dependencies from requirements.txt ...
pip install -r requirements.txt --quiet
IF ERRORLEVEL 1 (
    echo ERROR: Dependency installation failed.
    echo Make sure your Python version is 3.10, 3.11 or 3.12 (required for VTK).
    pause
    exit /b 1
)

REM ── Create directories ────────────────────────────────────────────────────────
IF NOT EXIST uploads  mkdir uploads
IF NOT EXIST outputs  mkdir outputs

REM ── Copy .env ────────────────────────────────────────────────────────────────
IF NOT EXIST .env (
    copy .env.example .env >nul
    echo .env created from .env.example - edit it if needed.
)

echo.
echo ============================================================
echo   Starting DICOM AI Service...
echo   API    ^>  http://localhost:8000
echo   Docs   ^>  http://localhost:8000/docs
echo   Health ^>  http://localhost:8000/health
echo ============================================================
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

ENDLOCAL
