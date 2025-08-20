from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resuelve backend/.env sin depender del cwd
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"  # -> .../Waste/backend/.env

class Settings(BaseSettings):
    APP_ENV: str = "dev"
    APP_NAME: str = "waste-collector"
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Pydantic Settings v2
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",                 # ignora variables no declaradas
    )

settings = Settings()
