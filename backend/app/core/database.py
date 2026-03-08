from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

from app.core.config import settings
#database for fastapi
kwargs = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite: use StaticPool — single shared connection, no pool exhaustion
    kwargs["connect_args"] = {"check_same_thread": False}
    kwargs["poolclass"] = StaticPool
else:
    kwargs["pool_size"] = 20
    kwargs["max_overflow"] = 20
    kwargs["pool_timeout"] = 30
    kwargs["pool_recycle"] = 1800
    kwargs["pool_pre_ping"] = True

engine = create_engine(
    settings.DATABASE_URL,
    **kwargs
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
