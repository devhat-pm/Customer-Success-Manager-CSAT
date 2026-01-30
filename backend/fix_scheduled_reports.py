"""Fix scheduled_reports table columns"""
from app.core.database import engine
from sqlalchemy import text

def fix_scheduled_reports():
    with engine.connect() as conn:
        print("Fixing scheduled_reports table...")

        # Check if name column exists and report_name doesn't
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'scheduled_reports'
        """))
        columns = [row[0] for row in result]
        print(f"Current columns: {columns}")

        # If 'name' exists but 'report_name' doesn't, we need to check if both exist
        if 'name' in columns and 'report_name' not in columns:
            print("  Need to add report_name column (copy from name)")
            # Add report_name column if it doesn't exist
            conn.execute(text("ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS report_name VARCHAR(255)"))
            conn.execute(text("UPDATE scheduled_reports SET report_name = name WHERE report_name IS NULL"))
            conn.commit()
            print("  Added and populated report_name column")

        # Similarly for last_generated_at
        if 'last_sent_at' in columns and 'last_generated_at' not in columns:
            print("  Need to add last_generated_at column (copy from last_sent_at)")
            conn.execute(text("ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMP"))
            conn.execute(text("UPDATE scheduled_reports SET last_generated_at = last_sent_at WHERE last_generated_at IS NULL"))
            conn.commit()
            print("  Added and populated last_generated_at column")

        # Make sure report_name has a NOT NULL constraint if name has data
        try:
            conn.execute(text("UPDATE scheduled_reports SET report_name = name WHERE report_name IS NULL AND name IS NOT NULL"))
            conn.commit()
        except Exception as e:
            print(f"  Note: {e}")

        # Verify
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'scheduled_reports'
            ORDER BY ordinal_position
        """))
        print("\n  Final columns in scheduled_reports:")
        for row in result:
            print(f"    - {row[0]}")

if __name__ == "__main__":
    fix_scheduled_reports()
    print("\nDone!")
