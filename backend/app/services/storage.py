"""Raw-file storage backed by S3-compatible object storage (AWS S3 / Supabase Storage)."""

import uuid
from functools import lru_cache

import boto3
from botocore.client import Config
from fastapi import HTTPException, status

from app.core.config import settings


@lru_cache
def _client():
    if not settings.s3_bucket:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File storage is not configured (set S3_BUCKET / S3_ENDPOINT / keys).",
        )
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint or None,
        aws_access_key_id=settings.s3_access_key or None,
        aws_secret_access_key=settings.s3_secret_key or None,
        config=Config(signature_version="s3v4"),
    )


def build_key(user_id: uuid.UUID, material_id: uuid.UUID, filename: str) -> str:
    safe = filename.replace("/", "_").replace("\\", "_").strip() or "file"
    return f"users/{user_id}/{material_id}/{safe}"


def put_object(key: str, data: bytes, content_type: str) -> str:
    _client().put_object(
        Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type
    )
    return key


def delete_object(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.s3_bucket, Key=key)
    except Exception:
        # Best-effort cleanup; a missing object should not block material deletion.
        pass
