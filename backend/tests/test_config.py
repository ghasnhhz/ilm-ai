from app.core.config import Settings


def test_admin_email_list_parses_and_lowercases():
    s = Settings(admin_emails="Alice@Example.com, bob@example.com ,")
    assert s.admin_email_list == ["alice@example.com", "bob@example.com"]


def test_admin_email_list_empty():
    assert Settings(admin_emails="").admin_email_list == []


def test_cors_origin_list_parses():
    s = Settings(cors_origins="http://localhost:3000, https://ilm.app")
    assert s.cors_origin_list == ["http://localhost:3000", "https://ilm.app"]
