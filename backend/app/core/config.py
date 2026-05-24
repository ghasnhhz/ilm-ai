from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    app_name: str = "Ilm AI"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    # --- Database ---
    database_url: str = "postgresql+psycopg2://ilm:ilm@db:5432/ilm"

    # --- Auth ---
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60
    refresh_token_ttl_days: int = 30
    # Shared secret for the server-to-server OAuth bridge (NextAuth -> backend).
    auth_bridge_secret: str = "change-me-in-env"

    # --- LLM ---
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    # --- Storage (S3 / Supabase) ---
    s3_bucket: str = ""
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    supabase_url: str = ""

    # --- Payments ---
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    payme_merchant_id: str = ""
    payme_secret_key: str = ""

    # --- Monitoring ---
    sentry_dsn: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
