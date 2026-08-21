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

    class Config:
        env_file = ".env"

settings = Settings()
