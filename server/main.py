"""
DICOM CT Scan AI Microservice
Performs 3D segmentation and reconstruction from DICOM files
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes import router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DICOM AI Service starting up...")
    logger.info(f"   Upload dir : {settings.UPLOAD_DIR}")
    logger.info(f"   Output dir : {settings.OUTPUT_DIR}")
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("🛑 DICOM AI Service shutting down...")


app = FastAPI(
    title="DICOM CT Scan AI Service",
    description=(
        "Microservice for DICOM CT scan segmentation and 3D model reconstruction "
        "using VTK, PyDICOM, and NumPy."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "DICOM CT Scan AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "dicom-ai-service"}
