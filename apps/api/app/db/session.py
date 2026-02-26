"""Database session management with writer/reader separation."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""

    pass


# Lazy-initialized writer engine + session factory (INSERT/UPDATE/DELETE).
_writer_engine: Optional[AsyncEngine] = None
_writer_session_factory: Optional[async_sessionmaker[AsyncSession]] = None

# Lazy-initialized reader engine + session factory (SELECT).
_reader_engine: Optional[AsyncEngine] = None
_reader_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def _get_writer_engine() -> AsyncEngine:
    """Return the shared writer async engine, creating it on first call."""
    global _writer_engine
    if _writer_engine is None:
        url = settings.db_writer_url
        if not url:
            raise RuntimeError(
                "DATABASE_URL (or DB_WRITER_HOST) is not configured. "
                "Set it in apps/api/.env or pass --env-file apps/api/.env to docker run."
            )
        _writer_engine = create_async_engine(
            url,
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _writer_engine


def _get_reader_engine() -> AsyncEngine:
    """Return the shared reader async engine, creating it on first call.

    Falls back to writer engine when no separate reader URL is configured.
    """
    global _reader_engine
    if _reader_engine is None:
        reader_url = settings.db_reader_url
        writer_url = settings.db_writer_url

        # If reader URL is same as writer (local/dev), reuse writer engine
        if reader_url == writer_url:
            return _get_writer_engine()

        _reader_engine = create_async_engine(
            reader_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _reader_engine


def _get_writer_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the shared writer session factory, creating it on first call."""
    global _writer_session_factory
    if _writer_session_factory is None:
        _writer_session_factory = async_sessionmaker(
            _get_writer_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _writer_session_factory


def _get_reader_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the shared reader session factory, creating it on first call."""
    global _reader_session_factory
    if _reader_session_factory is None:
        engine = _get_reader_engine()
        # If reader engine is the same object as writer, reuse writer factory
        if engine is _get_writer_engine():
            return _get_writer_session_factory()

        _reader_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _reader_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session (writer).

    Use for INSERT, UPDATE, DELETE operations and reads within write transactions.
    """
    async with _get_writer_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_read_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session (reader).

    Use for read-only SELECT queries. Routes to read replica in production.
    """
    async with _get_reader_session_factory()() as session:
        try:
            yield session
        finally:
            await session.close()


def create_writer_session() -> AsyncSession:
    """Create a writer session directly (not via FastAPI Depends).

    Caller is responsible for commit/rollback/close.
    """
    return _get_writer_session_factory()()


def create_reader_session() -> AsyncSession:
    """Create a reader session directly (not via FastAPI Depends).

    Caller is responsible for close.
    """
    return _get_reader_session_factory()()


async def init_db() -> None:
    """Initialize database tables (via writer)."""
    async with _get_writer_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close all database connections."""
    global _writer_engine, _writer_session_factory, _reader_engine, _reader_session_factory
    if _writer_engine is not None:
        await _writer_engine.dispose()
        _writer_engine = None
        _writer_session_factory = None
    if _reader_engine is not None:
        await _reader_engine.dispose()
        _reader_engine = None
        _reader_session_factory = None
