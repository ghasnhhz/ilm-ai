from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder value shipped in defaults; must be overridden before going to production.
_DEFAULT_SECRET = "change-me-in-env"

# Resolve the project root from this file's location so the .env is always
# found regardless of which directory uvicorn/alembic is run from.
_ENV_FILE = str(Path(__file__).resolve().parent.parent.parent.parent / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

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
    # Shared secret for the server-to-server Telegram bridge (bot -> backend).
    telegram_bot_secret: str = "change-me-in-env"
    telegram_bot_username: str = ""
    # Timezone reminders are scheduled in (audience is Uzbekistan / Central Asia).
    reminder_timezone: str = "Asia/Tashkent"

    # --- LLM ---
    # Groq is the primary provider (fast OpenAI-compatible inference); Anthropic
    # is the automatic fallback when no Groq key is configured.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384
    # Dev-only: when no OpenAI key is set, generate deterministic local embeddings so the
    # ingestion pipeline is testable offline. Never enable in production.
    dev_fake_embeddings: bool = False

    # --- Storage (S3 / Supabase) ---
    s3_bucket: str = ""
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    supabase_url: str = ""

    # --- Payments ---
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""
    payme_merchant_id: str = ""
    payme_secret_key: str = ""
    # Premium price in UZS (whole soʻm); Payme expects the amount in tiyin (×100).
    premium_amount_uzs: int = 50000
    premium_price_label: str = "$4.99/mo"
    # Base URL of the frontend, used for Stripe success/cancel redirects.
    app_base_url: str = "http://localhost:3000"

    # --- Monitoring ---
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    # Comma-separated emails allowed to hit the admin metrics endpoint.
    admin_emails: str = ""

    @model_validator(mode="after")
    def _require_secrets_in_production(self) -> "Settings":
        # In production the placeholder secrets are a real security hole (forgeable JWTs,
        # spoofable server-to-server bridges), so refuse to boot until they're set.
        # Dev/test keep the convenient defaults.
        if self.environment.lower() == "production":
            placeholders = [
                name
                for name in ("jwt_secret", "auth_bridge_secret", "telegram_bot_secret")
                if getattr(self, name) == _DEFAULT_SECRET
            ]
            if placeholders:
                raise ValueError(
                    "Refusing to start in production with default secrets: "
                    + ", ".join(placeholders)
                    + ". Set these to strong, unique values via environment variables."
                )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
