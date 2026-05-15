"""
Entry point for uvicorn.
Run: uvicorn main:app --host 0.0.0.0 --port 8000
Or via Docker: already configured in CMD.
"""
from app.main import app  # noqa: F401