"""Fix missing database columns"""
from app.core.database import engine
from sqlalchemy import text

def fix_tables():
    with engine.connect() as conn:
        # Fix health_score_history table - add missing columns
        print("Fixing health_score_history table...")
        try:
            conn.execute(text("""
                ALTER TABLE health_score_history
                ADD COLUMN IF NOT EXISTS product_adoption_score INTEGER,
                ADD COLUMN IF NOT EXISTS support_health_score INTEGER,
                ADD COLUMN IF NOT EXISTS engagement_score INTEGER,
                ADD COLUMN IF NOT EXISTS financial_health_score INTEGER,
                ADD COLUMN IF NOT EXISTS sla_compliance_score INTEGER,
                ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20)
            """))
            conn.commit()
            print("  Added missing columns to health_score_history")
        except Exception as e:
            print(f"  Error: {e}")
            conn.rollback()

        # Verify columns
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'health_score_history'
            ORDER BY ordinal_position
        """))
        print("\n  Columns in health_score_history:")
        for row in result:
            print(f"    - {row[0]}")

if __name__ == "__main__":
    fix_tables()
    print("\nDone!")
