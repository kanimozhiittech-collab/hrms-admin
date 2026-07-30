from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, engine
from .core.config import settings
from . import models  # noqa
from .routers import auth, employees, dashboard, meta, attendance, leave
from .seed import seed_if_empty, ensure_defaults

app = FastAPI(title="HRMS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    Base.metadata.create_all(bind=engine)
    from .migrate import run_migrations
    run_migrations()
    if settings.SEED_ON_BOOT == "1":
        seed_if_empty()
    ensure_defaults()

app.include_router(auth.router)
app.include_router(meta.router)
app.include_router(employees.router)
app.include_router(dashboard.router)
app.include_router(attendance.router)
app.include_router(leave.router)

@app.get("/")
def root():
    return {"name": "HRMS API", "docs": "/docs"}
