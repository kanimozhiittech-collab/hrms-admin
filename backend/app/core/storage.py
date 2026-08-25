"""Shared file-upload helper.

Uploaded files go to Vercel Blob instead of local disk. A previous version of
this app wrote uploads to a local folder next to the app code — that worked
locally, but on Vercel every serverless function invocation can run in a
different, ephemeral container, so a file saved during one request was often
gone by the time a later request tried to read it back (404s in production
even though the upload itself had "succeeded"). Vercel Blob is the persistent
store that survives across invocations and deploys.
"""
import uuid
from pathlib import Path

import vercel_blob
from fastapi import UploadFile


def save_bytes(content: bytes, original_filename: str | None, folder: str) -> tuple[str, str]:
    """Uploads raw bytes to Vercel Blob under `folder/` — use this when the
    caller already read the upload stream (e.g. to validate it first)."""
    ext = Path(original_filename or "").suffix
    pathname = f"{folder}/{uuid.uuid4().hex}{ext}"
    result = vercel_blob.put(pathname, content, {"addRandomSuffix": "false"})
    return original_filename or pathname, result["url"]


def save_upload(file: UploadFile, folder: str) -> tuple[str, str]:
    """Uploads `file` to Vercel Blob under `folder/`.

    Returns (original_filename, public_url) — public_url is a full
    https://...blob.vercel-storage.com/... URL, safe to store directly and
    use as-is in the frontend (not a path relative to our own API).
    """
    return save_bytes(file.file.read(), file.filename, folder)
