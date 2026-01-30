"""Check PostgreSQL enum values"""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check all enum types
    result = conn.execute(text("""
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        ORDER BY t.typname, e.enumsortorder
    """))

    current_type = None
    for row in result:
        if row[0] != current_type:
            print(f"\n{row[0]}:")
            current_type = row[0]
        print(f"  - {row[1]}")
