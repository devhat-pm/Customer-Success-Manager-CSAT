#!/usr/bin/env python3
"""Simple API Test Script"""

import requests
import json
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000/api/v1"

def test_api():
    print("=" * 60)
    print("SUCCESS MANAGER API TEST")
    print("=" * 60)

    # 1. Login
    print("\n1. Testing Login...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@extravis.com", "password": "Admin@123"}
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    tokens = login_response.json()
    token = tokens["access_token"]
    print(f"   [OK] Login successful, got access token")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Current User
    print("\n2. Testing Get Current User...")
    me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    assert me_response.status_code == 200, f"Get me failed: {me_response.text}"
    user = me_response.json()
    print(f"   [OK] Current user: {user['email']} ({user['role']})")

    # 3. Get Customers
    print("\n3. Testing Get Customers...")
    customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
    assert customers_response.status_code == 200, f"Get customers failed: {customers_response.text}"
    customers_data = customers_response.json()
    print(f"   [OK] Total customers: {customers_data['total']}")
    for c in customers_data['customers'][:3]:
        print(f"     - {c['company_name']} ({c['status']})")

    # 4. Get Customer Detail
    if customers_data['customers']:
        customer_id = customers_data['customers'][0]['id']
        print(f"\n4. Testing Get Customer Detail (ID: {customer_id[:8]}...)...")
        detail_response = requests.get(f"{BASE_URL}/customers/{customer_id}", headers=headers)
        assert detail_response.status_code == 200, f"Get customer detail failed: {detail_response.text}"
        detail = detail_response.json()
        print(f"   [OK] Customer: {detail['customer']['company_name']}")
        print(f"     - Deployments: {len(detail['product_deployments'])}")
        print(f"     - Active Alerts: {len(detail['active_alerts'])}")
        print(f"     - CSAT Surveys: {detail['csat_summary']['total_surveys']}")

    # 5. Get Alerts
    print("\n5. Testing Get Alerts...")
    alerts_response = requests.get(f"{BASE_URL}/alerts", headers=headers)
    assert alerts_response.status_code == 200, f"Get alerts failed: {alerts_response.text}"
    alerts_data = alerts_response.json()
    print(f"   [OK] Total alerts: {alerts_data['total']}")
    for a in alerts_data['alerts'][:3]:
        print(f"     - {a['title'][:50]}... ({a['severity']})")

    # 6. Get Interactions
    print("\n6. Testing Get Interactions...")
    interactions_response = requests.get(f"{BASE_URL}/interactions", headers=headers)
    assert interactions_response.status_code == 200, f"Get interactions failed: {interactions_response.text}"
    interactions_data = interactions_response.json()
    print(f"   [OK] Total interactions: {interactions_data['total']}")

    # 7. Get CSAT Surveys
    print("\n7. Testing Get CSAT Surveys...")
    csat_response = requests.get(f"{BASE_URL}/csat", headers=headers)
    assert csat_response.status_code == 200, f"Get CSAT failed: {csat_response.text}"
    csat_data = csat_response.json()
    print(f"   [OK] Total CSAT surveys: {csat_data['total']}")

    # 8. Get Dashboard Stats
    print("\n8. Testing Get Dashboard Stats...")
    dashboard_response = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    assert dashboard_response.status_code == 200, f"Get dashboard failed: {dashboard_response.text}"
    dashboard = dashboard_response.json()
    print(f"   [OK] Dashboard Stats:")
    print(f"     - Total Customers: {dashboard.get('total_customers', 'N/A')}")
    print(f"     - Active: {dashboard.get('active_customers', 'N/A')}")
    print(f"     - At Risk: {dashboard.get('at_risk_customers', 'N/A')}")
    print(f"     - Avg Health Score: {dashboard.get('average_health_score', 'N/A')}")

    # 9. Get Health Score Distribution
    print("\n9. Testing Get Health Score Distribution...")
    health_response = requests.get(f"{BASE_URL}/health-scores/distribution", headers=headers)
    assert health_response.status_code == 200, f"Get health scores failed: {health_response.text}"
    health_data = health_response.json()
    print(f"   [OK] Health distribution: {health_data}")

    # 10. Get Deployments
    print("\n10. Testing Get Deployments...")
    deploy_response = requests.get(f"{BASE_URL}/deployments", headers=headers)
    assert deploy_response.status_code == 200, f"Get deployments failed: {deploy_response.text}"
    deploy_data = deploy_response.json()
    print(f"   [OK] Total deployments: {deploy_data['total']}")

    # 11. Get Users (Admin only)
    print("\n11. Testing Get Users (Admin)...")
    users_response = requests.get(f"{BASE_URL}/users", headers=headers)
    assert users_response.status_code == 200, f"Get users failed: {users_response.text}"
    users_data = users_response.json()
    print(f"   [OK] Total users: {users_data['total']}")
    for u in users_data['users']:
        print(f"     - {u['email']} ({u['role']})")

    # 12. Get Scheduled Reports
    print("\n12. Testing Get Scheduled Reports...")
    reports_response = requests.get(f"{BASE_URL}/reports/scheduled", headers=headers)
    assert reports_response.status_code == 200, f"Get scheduled reports failed: {reports_response.text}"
    reports_data = reports_response.json()
    print(f"   [OK] Total scheduled reports: {reports_data.get('total', len(reports_data.get('reports', [])))}")
    for r in reports_data.get('reports', [])[:3]:
        print(f"     - {r['report_name']} ({r['frequency']})")

    # Test Manager Login
    print("\n13. Testing Manager Login...")
    manager_login = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "sarah.manager@extravis.com", "password": "Manager@123"}
    )
    assert manager_login.status_code == 200, f"Manager login failed: {manager_login.text}"
    print(f"   [OK] Manager login successful")

    # Test Viewer Login
    print("\n14. Testing Viewer Login...")
    viewer_login = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "emily.viewer@extravis.com", "password": "Viewer@123"}
    )
    assert viewer_login.status_code == 200, f"Viewer login failed: {viewer_login.text}"
    print(f"   [OK] Viewer login successful")

    print("\n" + "=" * 60)
    print("ALL API TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
