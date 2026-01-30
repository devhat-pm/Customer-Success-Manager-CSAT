"""Add customer_overview to reporttype enum"""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TYPE reporttype ADD VALUE IF NOT EXISTS 'customer_overview'"))
        conn.commit()
        print("Added customer_overview to reporttype")
    except Exception as e:
        print(f"Error: {e}")
