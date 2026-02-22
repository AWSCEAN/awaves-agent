"""Pytest configuration and shared fixtures for the test suite."""

import asyncio

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Every username created by tests — wiped before the session so re-runs start clean.
_TEST_USERNAMES = [
    "testuser",
    "testuser2",
    "testuser3",
    "duplicateuser",
    "user_beginner",
    "user_intermediate",
    "user_advanced",
    "invalidleveluser",
    "formatuser",
]


def _delete_test_users() -> None:
    """Delete all test usernames from the DB using a dedicated event loop."""
    from app.config import settings  # imported here to avoid circular import at collection

    if not settings.database_url:
        return

    async def _run() -> None:
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text("DELETE FROM users WHERE username = ANY(:names)"),
                    {"names": _TEST_USERNAMES},
                )
        finally:
            await engine.dispose()

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_run())
    finally:
        loop.close()


@pytest.fixture(scope="session", autouse=True)
def clean_test_data() -> None:
    """Wipe test users before (and after) the full test session."""
    _delete_test_users()
    yield
    _delete_test_users()


@pytest.fixture(scope="module", autouse=True)
def persistent_test_client() -> None:
    """
    Keep a single TestClient (and its anyio portal) alive for the whole module.

    Starlette's TestClient creates a *new* anyio event loop for every
    individual request when not used as a context manager.  If a test makes
    two sequential requests, the second one opens a fresh event loop while
    asyncpg still holds connections tied to the first (now-closed) loop,
    causing 'Event loop is closed' errors.

    By entering the TestClient context manager once at module scope and
    replacing the module-level ``client`` variable, all requests in the
    module share one persistent portal and event loop.
    """
    import tests.test_register as _mod
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        _mod.client = c
        yield c
