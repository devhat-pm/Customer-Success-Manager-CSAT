"""Fix PostgreSQL enum values to match Python enums"""
from app.core.database import engine
from sqlalchemy import text

def fix_enums():
    with engine.connect() as conn:
        # Add missing values to userrole enum
        print("Fixing userrole enum...")
        try:
            conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'account_manager'"))
            conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'csm'"))
            conn.commit()
            print("  Added account_manager, csm to userrole")
        except Exception as e:
            print(f"  Warning: {e}")
            conn.rollback()

        # Add missing values to activitytype enum
        print("Fixing activitytype enum...")
        try:
            conn.execute(text("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'task'"))
            conn.execute(text("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'health_check'"))
            conn.execute(text("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'contract_update'"))
            conn.execute(text("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'support_ticket'"))
            conn.commit()
            print("  Added task, health_check, contract_update, support_ticket to activitytype")
        except Exception as e:
            print(f"  Warning: {e}")
            conn.rollback()

        # Verify the updates
        print("\nVerifying enum values...")
        result = conn.execute(text("""
            SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as labels
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname IN ('userrole', 'activitytype')
            GROUP BY t.typname
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]}")

if __name__ == "__main__":
    fix_enums()
    print("\nDone!")
