#!/usr/bin/env python3
"""
Security Verification Script for Success Manager
Runs a series of checks to ensure the application is production-ready.

Usage: python security_check.py
"""

import os
import sys
import re
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")


def print_check(name, passed, details=""):
    status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"  {status} - {name}")
    if details and not passed:
        print(f"         {Colors.YELLOW}{details}{Colors.RESET}")


def print_warning(text):
    print(f"  {Colors.YELLOW}⚠ WARNING: {text}{Colors.RESET}")


def check_env_file():
    """Check environment file configuration."""
    print_header("Environment Configuration")

    env_file = Path(__file__).parent.parent / 'backend' / '.env.production'
    checks = []

    if not env_file.exists():
        print_check(".env.production exists", False, "File not found")
        return False

    print_check(".env.production exists", True)

    content = env_file.read_text()

    # Check for placeholder values
    placeholders = [
        "GENERATE_STRONG_PASSWORD_HERE",
        "GENERATE_64_CHAR_SECRET_KEY_HERE",
        "your-production-db-host.com",
        "your-production-domain.com"
    ]

    has_placeholders = any(p in content for p in placeholders)
    print_check("No placeholder values", not has_placeholders,
                "Update placeholder values before deployment")
    checks.append(not has_placeholders)

    # Check DEBUG setting
    debug_off = "DEBUG=false" in content or "DEBUG=False" in content
    print_check("DEBUG=false", debug_off, "Set DEBUG=false for production")
    checks.append(debug_off)

    # Check token expiry
    has_token_expiry = "ACCESS_TOKEN_EXPIRE_MINUTES=480" in content
    print_check("Token expiry = 480 minutes", has_token_expiry)
    checks.append(has_token_expiry)

    return all(checks)


def check_secret_keys():
    """Check for hardcoded secrets in codebase."""
    print_header("Secret Key Security")

    backend_dir = Path(__file__).parent.parent / 'backend'
    issues = []

    # Patterns that indicate hardcoded secrets
    secret_patterns = [
        (r'SECRET_KEY\s*=\s*["\'][^"\']{1,30}["\']', "Short SECRET_KEY found"),
        (r'password\s*=\s*["\'][^"\']+["\']', "Hardcoded password"),
        (r'Admin@123', "Default admin password in code"),
    ]

    # Files to check
    check_extensions = ['.py', '.js', '.jsx', '.ts', '.tsx']

    for file_path in backend_dir.rglob('*'):
        if file_path.suffix in check_extensions and 'venv' not in str(file_path):
            try:
                content = file_path.read_text(errors='ignore')
                for pattern, message in secret_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        # Ignore test files and examples
                        if 'test' not in str(file_path).lower() and 'example' not in str(file_path).lower():
                            rel_path = file_path.relative_to(backend_dir.parent)
                            issues.append(f"{rel_path}: {message}")
            except Exception:
                pass

    # Check for .env files that shouldn't be committed
    env_files = list(backend_dir.glob('.env*'))
    env_files = [f for f in env_files if f.name not in ['.env.example', '.env.production']]

    no_exposed_secrets = len(issues) == 0
    print_check("No hardcoded secrets", no_exposed_secrets)
    for issue in issues[:5]:  # Show max 5 issues
        print_warning(issue)

    no_env_committed = len(env_files) == 0
    print_check("No .env files (except examples)", no_env_committed)
    for env_file in env_files:
        print_warning(f"Remove from repo: {env_file.name}")

    return no_exposed_secrets and no_env_committed


def check_dependencies():
    """Check for security in dependencies."""
    print_header("Dependency Security")

    requirements_file = Path(__file__).parent.parent / 'backend' / 'requirements.txt'

    if not requirements_file.exists():
        print_check("requirements.txt exists", False)
        return False

    print_check("requirements.txt exists", True)

    content = requirements_file.read_text()

    # Check for version pinning
    lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('#')]
    pinned = sum(1 for l in lines if '==' in l)
    total = len(lines)

    pinning_ratio = pinned / total if total > 0 else 0
    has_pinning = pinning_ratio > 0.8
    print_check(f"Dependencies pinned ({pinned}/{total})", has_pinning,
                "Pin all dependencies with == for reproducibility")

    # Check for known vulnerable packages (basic check)
    vulnerable = ['pyyaml<5.4', 'urllib3<1.26', 'requests<2.25']
    has_vulnerable = any(v in content.lower() for v in vulnerable)
    print_check("No known vulnerable versions", not has_vulnerable)

    return has_pinning and not has_vulnerable


def check_api_security():
    """Check API security configuration."""
    print_header("API Security")

    auth_file = Path(__file__).parent.parent / 'backend' / 'app' / 'api' / 'v1' / 'endpoints' / 'auth.py'

    if not auth_file.exists():
        print_check("Auth endpoints file exists", False)
        return False

    content = auth_file.read_text()

    # Check for proper authentication decorators
    has_auth_dependency = 'Depends(get_current_user)' in content
    print_check("Authentication dependency used", has_auth_dependency)

    has_admin_dependency = 'Depends(get_admin_user)' in content
    print_check("Admin-only endpoints protected", has_admin_dependency)

    # Check for password hashing
    has_password_hash = 'get_password_hash' in content
    print_check("Password hashing implemented", has_password_hash)

    return all([has_auth_dependency, has_admin_dependency, has_password_hash])


def check_cors_config():
    """Check CORS configuration."""
    print_header("CORS Configuration")

    config_file = Path(__file__).parent.parent / 'backend' / 'app' / 'core' / 'config.py'

    if not config_file.exists():
        print_check("Config file exists", False)
        return False

    content = config_file.read_text()

    # Check CORS is not set to allow all
    allows_all = '"*"' in content and 'CORS' in content
    print_check("CORS not set to allow all (*)", not allows_all,
                "Restrict CORS to specific origins in production")

    return not allows_all


def check_database_security():
    """Check database security settings."""
    print_header("Database Security")

    compose_file = Path(__file__).parent.parent / 'docker-compose.production.yml'

    if not compose_file.exists():
        print_check("Production docker-compose exists", False)
        return False

    content = compose_file.read_text()

    # Check database is not exposed externally
    db_exposed = 'ports:' in content.split('backend:')[0] and '"5432:5432"' in content
    print_check("Database not exposed externally", not db_exposed,
                "Remove port mapping for database in production")

    # Check for environment variable usage
    uses_env_vars = '${POSTGRES_PASSWORD}' in content
    print_check("Uses environment variables for credentials", uses_env_vars)

    return not db_exposed and uses_env_vars


def generate_report():
    """Generate security check report."""
    print(f"\n{Colors.BOLD}Security Verification Report{Colors.RESET}")
    print(f"Generated: {__import__('datetime').datetime.now().isoformat()}")
    print("-" * 60)

    results = []

    results.append(("Environment Configuration", check_env_file()))
    results.append(("Secret Key Security", check_secret_keys()))
    results.append(("Dependency Security", check_dependencies()))
    results.append(("API Security", check_api_security()))
    results.append(("CORS Configuration", check_cors_config()))
    results.append(("Database Security", check_database_security()))

    # Summary
    print_header("SUMMARY")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"  [{status}] {name}")

    print()
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All security checks passed! Ready for production.{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠ {total - passed} security checks need attention.{Colors.RESET}")
        print(f"  Please address the issues above before deploying to production.")
        return 1


if __name__ == "__main__":
    sys.exit(generate_report())
