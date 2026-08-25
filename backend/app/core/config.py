import os

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres:test1234@localhost:5432/hrms"
    JWT_SECRET: str = "dev-secret"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    SEED_ON_BOOT: str = "1"
    PROVISION_SECRET: str = "dev-provision-secret"
    SUPER_ADMIN_URL: str = "http://localhost:8001"
    BLOB_READ_WRITE_TOKEN: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

# The vercel_blob package reads this straight from the process environment —
# in production Vercel already injects it there, but locally it only lands in
# our pydantic Settings (via .env), so mirror it across for local dev.
if settings.BLOB_READ_WRITE_TOKEN:
    os.environ.setdefault("BLOB_READ_WRITE_TOKEN", settings.BLOB_READ_WRITE_TOKEN)
