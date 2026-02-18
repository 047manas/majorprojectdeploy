import requests
import json

BASE = "http://127.0.0.1:5000"
results = []

def check(name, url, session, expect_type="list"):
    try:
        r = session.get(f"{BASE}{url}")
        if r.status_code != 200:
            results.append(f"FAIL {name}: HTTP {r.status_code}")
            return
        body = r.json()
        if not body.get("success"):
            results.append(f"FAIL {name}: success=false error={body.get('error')}")
            return
        data = body.get("data")
        dtype = type(data).__name__
        if expect_type == "list" and not isinstance(data, list):
            results.append(f"FAIL {name}: Expected list got {dtype} val={str(data)[:80]}")
        elif expect_type == "dict" and not isinstance(data, dict):
            results.append(f"FAIL {name}: Expected dict got {dtype}")
        else:
            results.append(f"OK   {name}: {dtype}")
    except Exception as e:
        results.append(f"FAIL {name}: {e}")

s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
results.append(f"Login: {r.status_code} success={r.json().get('success')}")

check("KPIs", "/api/analytics/kpis", s, "dict")
check("Distribution", "/api/analytics/distribution", s, "list")
check("DeptPart", "/api/analytics/department-participation", s, "list")
check("YearlyTrend", "/api/analytics/yearly-trend", s, "list")
check("VerifSummary", "/api/analytics/verification-summary", s, "dict")
check("Insights", "/api/analytics/insights", s, "dict")
check("Meta", "/api/analytics/meta", s, "dict")
check("StudentList", "/api/analytics/student-list", s, "dict")
check("EventsSummary", "/api/analytics/events-summary", s, "list")
check("AdminUsers", "/api/admin/users", s, "list")
check("ActivityTypes", "/api/admin/activity-types", s, "list")
check("FacultyQueue", "/api/faculty/", s, "any")

with open("verify_results.txt", "w") as f:
    f.write("\n".join(results))

print("Results written to verify_results.txt")
