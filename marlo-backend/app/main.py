import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app import models  # noqa: F401
from app.routers import auth, tasks, analytics, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Marlo Internship Performance Tracker",
    description="Система оценки эффективности практикантов",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: localhost on Windows often resolves to [::1]; Next.js may use another port.
_default_origins = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://[::1]:3000"
)
_cors_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", _default_origins).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$",
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Chrome: preflight from localhost:3000 → 127.0.0.1:8000 requires this.
    allow_private_network=True,
)

# Подключение роутеров с ПРАВИЛЬНЫМИ префиксами
app.include_router(auth.router)
app.include_router(tasks.router, prefix="/api/v1", tags=["tasks"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
app.include_router(submissions.router, prefix="/api/v1", tags=["submissions"])


@app.get("/")
async def root():
    return {"message": "Marlo backend запущен", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
