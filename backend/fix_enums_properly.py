"""
Fix PostgreSQL enum values back to match frontend expectations.
The correct fix is to make enums use VALUES not NAMES.
"""
from app.core.database import engine
from sqlalchemy import text

def fix_enums_back():
    """Revert enum values to match what frontend sends"""
    with engine.connect() as conn:
        # Revert the mappings: enum_type -> [(current_value, correct_value), ...]
        enum_fixes = {
            'producttype': [
                ('MONETX', 'MonetX'),
                ('SUPPORTX', 'SupportX'),
                ('GREENX', 'GreenX'),
            ],
            'ticketpriority': [
                ('LOW', 'low'),
                ('MEDIUM', 'medium'),
                ('HIGH', 'high'),
                ('CRITICAL', 'critical'),
            ],
            'ticketstatus': [
                ('OPEN', 'open'),
                ('IN_PROGRESS', 'in_progress'),
                ('RESOLVED', 'resolved'),
                ('CLOSED', 'closed'),
            ],
            'activitytype': [
                ('MEETING', 'meeting'),
                ('CALL', 'call'),
                ('EMAIL', 'email'),
                ('NOTE', 'note'),
                ('ESCALATION', 'escalation'),
                ('REVIEW', 'review'),
                ('CONTRACT_RENEWAL', 'contract_renewal'),
                ('SYSTEM_ALERT', 'system_alert'),
                ('TASK', 'task'),
                ('HEALTH_CHECK', 'health_check'),
                ('CONTRACT_UPDATE', 'contract_update'),
                ('SUPPORT_TICKET', 'support_ticket'),
            ],
            'creatortype': [
                ('CUSTOMER', 'customer'),
                ('STAFF', 'staff'),
            ],
        }

        for enum_type, mappings in enum_fixes.items():
            print(f"\nReverting {enum_type}...")
            for old_val, new_val in mappings:
                try:
                    conn.execute(text(f"ALTER TYPE {enum_type} RENAME VALUE '{old_val}' TO '{new_val}'"))
                    print(f"  Renamed '{old_val}' -> '{new_val}'")
                except Exception as e:
                    if 'does not exist' in str(e):
                        print(f"  Value '{old_val}' doesn't exist, skipping")
                    else:
                        print(f"  Error: {e}")
            conn.commit()

        # Verify
        print("\n\nVerifying enum values...")
        result = conn.execute(text("""
            SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as labels
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname IN ('producttype', 'ticketpriority', 'ticketstatus', 'activitytype', 'creatortype')
            GROUP BY t.typname
            ORDER BY t.typname
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]}")

if __name__ == "__main__":
    fix_enums_back()
    print("\nDone!")
