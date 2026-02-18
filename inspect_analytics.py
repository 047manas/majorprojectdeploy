
import requests
import json

BASE_URL = "http://127.0.0.1:5000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
KPIS_URL = f"{BASE_URL}/api/analytics/kpis"
DIST_URL = f"{BASE_URL}/api/analytics/distribution"

def inspect():
    s = requests.Session()
    # Login
    s.post(LOGIN_URL, json={"email": "admin@example.com", "password": "admin"})
    
    # Check KPIs
    print("\n--- KPIs Response ---")
    r = s.get(KPIS_URL)
    if r.status_code == 200:
        data = r.json()
        print(json.dumps(data, indent=2)[:500]) # First 500 chars
    else:
        print(f"Error: {r.status_code}")

    # Check Distribution
    print("\n--- Distribution Response ---")
    r = s.get(DIST_URL)
    if r.status_code == 200:
        data = r.json()
        print(json.dumps(data, indent=2)[:500])
    else:
        print(f"Error: {r.status_code}")

if __name__ == "__main__":
    inspect()
