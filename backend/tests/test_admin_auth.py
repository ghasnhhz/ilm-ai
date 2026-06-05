def test_metrics_requires_auth(client):
    # HTTPBearer(auto_error=True) rejects a missing token before any DB access.
    resp = client.get("/admin/metrics")
    assert resp.status_code == 403
