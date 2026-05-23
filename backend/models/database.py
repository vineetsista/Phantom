import logging
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# v8 — lightweight schema migrations.
#
# Background: `Base.metadata.create_all` creates tables that don't exist but
# never ALTERs existing ones. As we added columns to `Video` and `User`
# across v6/v7, the actual Postgres table fell out of sync with the model.
# A single CRUD query against /api/v1/videos blew up with
# `column videos.user_id does not exist` — every list endpoint and every
# owner-scoped endpoint silently broke in any environment that already had
# the table from v5.
#
# We're a single-developer pre-revenue project — bringing in Alembic just to
# track these handful of additions would be theater. Instead we keep an
# explicit list of `(table, column, ddl)` triples below and apply them
# idempotently at boot. `information_schema.columns` is the safety check so
# this is a no-op after the first run.
#
# When you add a column to a model: add an entry here in the same commit.
SCHEMA_PATCHES: list[tuple[str, str, str]] = [
    # videos — v6 ownership + visibility
    ("videos", "user_id",
     "ALTER TABLE videos ADD COLUMN user_id VARCHAR(36)"),
    ("videos", "visibility",
     "ALTER TABLE videos ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'public'"),
    # videos — v6 written summary
    ("videos", "summary_data",
     "ALTER TABLE videos ADD COLUMN summary_data JSON"),
    # videos — v7 quality signals snapshot
    ("videos", "quality_signals",
     "ALTER TABLE videos ADD COLUMN quality_signals JSON"),
    # videos — v7d intake metadata
    ("videos", "intake_kind",
     "ALTER TABLE videos ADD COLUMN intake_kind VARCHAR(16) NOT NULL DEFAULT 'repo'"),
    ("videos", "intake_meta",
     "ALTER TABLE videos ADD COLUMN intake_meta JSON"),
    # users — v6 webhook integration
    ("users", "webhook_url",
     "ALTER TABLE users ADD COLUMN webhook_url TEXT NOT NULL DEFAULT ''"),
    ("users", "webhook_secret",
     "ALTER TABLE users ADD COLUMN webhook_secret VARCHAR(64) NOT NULL DEFAULT ''"),
]


def _apply_schema_patches() -> None:
    """Apply any SCHEMA_PATCHES entries whose target column doesn't already
    exist. Idempotent — safe to run on every boot."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl in SCHEMA_PATCHES:
            if not inspector.has_table(table):
                # The CREATE TABLE branch below will get it; skip.
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column in existing:
                continue
            logger.info("schema patch: %s.%s — applying", table, column)
            conn.execute(text(ddl))


def init_db() -> None:
    # Import models so their tables register on Base.metadata before create_all.
    from . import api_key, social, user, video  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _apply_schema_patches()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
