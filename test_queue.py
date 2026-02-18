"""Test CSEHod queue after fix."""
import requests
s = requests.Session()
r = s.post('http://127.0.0.1:5000/api/auth/login', json={'email': 'cseHod@college.edu', 'password': 'faculty123'})
print(f"Login: {r.status_code}")
r = s.get('http://127.0.0.1:5000/api/faculty/')
items = r.json()
print(f"CSEHod queue items: {len(items)}")
for x in items:
    print(f"  {x.get('title', 'N/A')} | {x.get('student_name', 'N/A')}")
