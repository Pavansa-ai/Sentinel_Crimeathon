
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()
print("ENV FILE LOADED:", os.path.exists(".env"))
print("DATABASE URL FOUND:", bool(os.getenv("DATABASE_URL")))

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    with engine.connect() as connection:
        print(connection.execute(text("SELECT current_database()")).scalar())
        print("SENTINEL database connected successfully!")
