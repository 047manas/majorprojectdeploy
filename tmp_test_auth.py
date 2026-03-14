import requests

def test_auth_me():
    url = "http://localhost:5000/api/auth/me"
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response body: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_auth_me()
