
import requests
import sys

BASE_URL = "http://127.0.0.1:5000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
KPIS_URL = f"{BASE_URL}/api/analytics/kpis"
TREND_URL = f"{BASE_URL}/api/analytics/yearly-trend"
DIST_URL = f"{BASE_URL}/api/analytics/distribution"
DEPT_URL = f"{BASE_URL}/api/analytics/department-participation"

def check_analytics():
    s = requests.Session()
    
    # 1. Login
    print(f"Logging in as admin...")
    try:
        login_resp = s.post(LOGIN_URL, json={"email": "admin@example.com", "password": "admin"}, headers={"Content-Type": "application/json"})
        print(f"Login Status: {login_resp.status_code}")
        if login_resp.status_code != 200:
            print("Login failed, cannot proceed.")
            print(login_resp.text)
            return
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 2. Check Endpoints
    endpoints = [
        ("KPIs", KPIS_URL),
        ("Yearly Trend", TREND_URL),
        ("Distribution", DIST_URL),
        ("Dept Participation", DEPT_URL)
    ]
    
    for name, url in endpoints:
        print(f"Checking {name}...", end=" ")
        try:
            resp = s.get(url)
            print(f"[{resp.status_code}]")
            if resp.status_code != 200:
                print(f"  Error: {resp.text[:200]}")
            else:
                data = resp.json()
                print(f"  Success. Data keys: {list(data.get('data', {}).keys()) if isinstance(data.get('data'), dict) else 'List/Other'}")
        except Exception as e:
            print(f"  Exception: {e}")

if __name__ == "__main__":
    check_analytics()
