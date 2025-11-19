from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    APP_NAME: str = "WorldPass API"
    API_PREFIX: str = "/api"
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "worldpass.db")
    CHALLENGE_TTL_SECONDS: int = 180
    ADMIN_USER: str = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASS_HASH: str = os.getenv("ADMIN_PASS_HASH", "")  # bcrypt hash
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.urandom(32).hex())
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    # VC Encryption - Used to encrypt VCs at rest in the database
    # Generate with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    VC_ENCRYPTION_KEY: str = os.getenv("VC_ENCRYPTION_KEY", "")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
