from pydantic_settings import BaseSettings
import os
import warnings

class Settings(BaseSettings):
    APP_NAME: str = "WorldPass API"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "worldpass.db")
    CHALLENGE_TTL_SECONDS: int = 180
    ADMIN_USER: str = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASS_HASH: str = os.getenv("ADMIN_PASS_HASH", "$2b$12$rV305vOf0QA17Bq1o4WrPOzsfWpI7y9cSviK5zl3JHcEXqLRjDq4u")  # bcrypt hash
    
    # JWT Secret - must be set in production
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Generate JWT secret if not set (development only)
        if not self.JWT_SECRET:
            if self.ENVIRONMENT == "production":
                raise ValueError(
                    "🔒 SECURITY ERROR: JWT_SECRET must be set in production environment!\n"
                    "Generate one with: python -c 'import secrets; print(secrets.token_hex(32))'\n"
                    "Then add to .env: JWT_SECRET=<generated-value>"
                )
            else:
                self.JWT_SECRET = os.urandom(32).hex()
                warnings.warn(
                    "⚠️  JWT_SECRET not set. Using auto-generated key for development.\n"
                    "   All tokens will be invalid after server restart.\n"
                    "   Set JWT_SECRET in .env for persistent tokens.",
                    RuntimeWarning
                )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    # VC Encryption - Used to encrypt VCs at rest in the database
    # Generate with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    VC_ENCRYPTION_KEY: str = os.getenv("VC_ENCRYPTION_KEY", "lIwAjiHC7Rep5_Vb5vH-nXBHDWiMQnwclFUCga2CNLE=")
    
    # Public URL for email links (Frontend URL)
    APP_URL: str = os.getenv("APP_URL", "http://localhost:5173")
    
    # Payment Provider Settings
    PAYMENT_PROVIDER_BASE_URL: str = os.getenv("PAYMENT_PROVIDER_BASE_URL", "http://localhost:8000/mock-provider")
    PAYMENT_WEBHOOK_SECRET: str = os.getenv("PAYMENT_WEBHOOK_SECRET", "mock_webhook_secret_change_in_production")
    
    def validate_production_security(self):
        """Validate security settings for production deployment"""
        if self.ENVIRONMENT != "production":
            return
        
        issues = []
        
        # Check default values in production
        if self.ADMIN_PASS_HASH == "$2b$12$rV305vOf0QA17Bq1o4WrPOzsfWpI7y9cSviK5zl3JHcEXqLRjDq4u":
            issues.append("⚠️  ADMIN_PASS_HASH is using default value")
        
        if self.VC_ENCRYPTION_KEY == "lIwAjiHC7Rep5_Vb5vH-nXBHDWiMQnwclFUCga2CNLE=":
            issues.append("⚠️  VC_ENCRYPTION_KEY is using default value")
        
        if self.PAYMENT_WEBHOOK_SECRET == "mock_webhook_secret_change_in_production":
            issues.append("⚠️  PAYMENT_WEBHOOK_SECRET is using default value")
        
        if "localhost" in self.CORS_ORIGINS:
            issues.append("⚠️  CORS_ORIGINS contains localhost")
        
        if issues:
            warning_msg = "\n🔒 PRODUCTION SECURITY WARNINGS:\n" + "\n".join(f"   {issue}" for issue in issues)
            warning_msg += "\n\n   These should be changed before production deployment."
            warning_msg += "\n   See .env.example for guidance.\n"
            warnings.warn(warning_msg, RuntimeWarning)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Run production security validation on startup
settings.validate_production_security()
