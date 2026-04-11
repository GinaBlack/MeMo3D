"""
DICOM CT Scan AI Service - Main Entry Point
"""

import asyncio
import sys
import traceback
import logging

# ── Windows asyncio fix (must be before any other async imports) ──────────────
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from api.routes import router
from core.config import settings, DEVICE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DICOM AI Service starting up...")
    logger.info(f"🔧 Device : {DEVICE}")
    logger.info(f"📁 Upload : {settings.UPLOAD_DIR}")
    logger.info(f"📁 Output : {settings.OUTPUT_DIR}")
    if torch.cuda.is_available():
        logger.info(f"🔥 GPU    : {torch.cuda.get_device_name(0)}")
    else:
        logger.info("⚠️  Running on CPU")
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("✅ Service ready")
    yield
    logger.info("🛑 DICOM AI Service shutting down...")


app = FastAPI(
    title="DICOM CT Scan AI Service",
    description="DICOM CT scan segmentation and 3D reconstruction using VTK, PyDICOM, MONAI and NumPy.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "message": "Internal Server Error", "path": str(request.url)},
    )


@app.get("/", tags=["Health"])
def root():
    return {"message": "DICOM AI Service is running", "status": "ok", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "device": str(DEVICE)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
