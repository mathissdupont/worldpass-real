from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "WorldPass API"
    API_PREFIX: str = "/api"
    SQLITE_PATH: str = "worldpass.db"
    CHALLENGE_TTL_SECONDS: int = 180
    ADMIN_USER: str = "admin"
    ADMIN_PASS: str = "admin123"  # dev-only; prod'da env var
    ADMIN_JWT: str = "dev-static-token"  # dev-only
settings = Settings()
