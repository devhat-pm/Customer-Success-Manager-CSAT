"""Fix PostgreSQL enum values to match SQLAlchemy enum names"""
from app.core.database import engine
from sqlalchemy import text

def fix_enum_values():
    """
    SQLAlchemy uses enum NAMES (e.g., CRITICAL) but our DB has VALUES (e.g., critical).
    We need to rename the enum values to match the names.
    """
    with engine.connect() as conn:

        # Define the mappings: enum_type -> [(old_value, new_value), ...]
        enum_fixes = {
            'producttype': [
                ('MonetX', 'MONETX'),
                ('SupportX', 'SUPPORTX'),
                ('GreenX', 'GREENX'),
            ],
            'ticketpriority': [
                ('low', 'LOW'),
                ('medium', 'MEDIUM'),
                ('high', 'HIGH'),
                ('critical', 'CRITICAL'),
            ],
            'ticketstatus': [
                ('open', 'OPEN'),
                ('in_progress', 'IN_PROGRESS'),
                ('resolved', 'RESOLVED'),
                ('closed', 'CLOSED'),
            ],
            'activitytype': [
                ('meeting', 'MEETING'),
                ('call', 'CALL'),
                ('email', 'EMAIL'),
                ('note', 'NOTE'),
                ('escalation', 'ESCALATION'),
                ('review', 'REVIEW'),
                ('contract_renewal', 'CONTRACT_RENEWAL'),
                ('system_alert', 'SYSTEM_ALERT'),
                ('task', 'TASK'),
                ('health_check', 'HEALTH_CHECK'),
                ('contract_update', 'CONTRACT_UPDATE'),
                ('support_ticket', 'SUPPORT_TICKET'),
            ],
            'reporttype': [
                ('health_summary', 'health_summary'),
                ('csat_analysis', 'csat_analysis'),
                ('at_risk_customers', 'at_risk_customers'),
                ('executive_summary', 'executive_summary'),
                ('customer_overview', 'customer_overview'),
            ],
            'creatortype': [
                ('customer', 'CUSTOMER'),
                ('staff', 'STAFF'),
            ],
        }

        for enum_type, mappings in enum_fixes.items():
            print(f"\nFixing {enum_type}...")
            for old_val, new_val in mappings:
                if old_val == new_val:
                    continue
                try:
                    conn.execute(text(f"ALTER TYPE {enum_type} RENAME VALUE '{old_val}' TO '{new_val}'"))
                    print(f"  Renamed '{old_val}' -> '{new_val}'")
                except Exception as e:
                    if 'does not exist' in str(e):
                        print(f"  Value '{old_val}' does not exist in {enum_type}, skipping")
                    else:
                        print(f"  Error renaming {old_val}: {e}")
            conn.commit()

        # Verify the updates
        print("\n\nVerifying enum values...")
        result = conn.execute(text("""
            SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as labels
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname IN ('producttype', 'ticketpriority', 'ticketstatus', 'activitytype', 'reporttype', 'creatortype')
            GROUP BY t.typname
            ORDER BY t.typname
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]}")

if __name__ == "__main__":
    fix_enum_values()
    print("\nDone!")
