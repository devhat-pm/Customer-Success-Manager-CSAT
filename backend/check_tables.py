"""Check database tables and columns"""
from app.core.database import engine
from sqlalchemy import text, inspect

def check_tables():
    inspector = inspect(engine)

    # Tables to check
    tables_to_check = [
        'health_scores',
        'health_score_history',
        'support_tickets',
        'activity_logs',
        'scheduled_reports',
        'report_history',
    ]

    for table in tables_to_check:
        if table in inspector.get_table_names():
            print(f"\n{table} EXISTS")
            columns = inspector.get_columns(table)
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
        else:
            print(f"\n{table} MISSING!")

if __name__ == "__main__":
    check_tables()
