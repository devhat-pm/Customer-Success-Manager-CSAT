"""Test if app imports correctly"""
try:
    from app.main import app
    print("Import successful!")
except Exception as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()
