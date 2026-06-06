import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_default_secret():
    with pytest.raises(ValidationError, match="auth_bridge_secret"):
        Settings(
            environment="production",
            jwt_secret="real-jwt",
            auth_bridge_secret="change-me-in-env",
            telegram_bot_secret="real-tg",
        )


def test_production_allows_overridden_secrets():
    s = Settings(
        environment="production",
        jwt_secret="real-jwt",
        auth_bridge_secret="real-bridge",
        telegram_bot_secret="real-tg",
    )
    assert s.environment == "production"


def test_development_allows_default_secrets():
    # The convenient defaults must not block local/dev startup.
    s = Settings(
        environment="development",
        jwt_secret="change-me-in-env",
        auth_bridge_secret="change-me-in-env",
        telegram_bot_secret="change-me-in-env",
    )
    assert s.jwt_secret == "change-me-in-env"


def test_admin_email_list_parses_and_lowercases():
    s = Settings(admin_emails="Alice@Example.com, bob@example.com ,")
    assert s.admin_email_list == ["alice@example.com", "bob@example.com"]


def test_admin_email_list_empty():
    assert Settings(admin_emails="").admin_email_list == []


def test_cors_origin_list_parses():
    s = Settings(cors_origins="http://localhost:3000, https://ilm.app")
    assert s.cors_origin_list == ["http://localhost:3000", "https://ilm.app"]
