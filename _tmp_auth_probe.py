import json, re, urllib.request, urllib.error, secrets

cfg = open(r"C:/Users/NEO/ozon_tracker/config.js", encoding="utf-8").read()
URL = re.search(r'SUPABASE_URL\s*=\s*"([^"]+)"', cfg).group(1)
KEY = re.search(r'SUPABASE_ANON_KEY\s*=\s*"([^"]+)"', cfg).group(2 - 1)

def call(path, payload=None, method="POST", token=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(URL + path, data=data, method=method)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", "Bearer " + (token or KEY))
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]
    except Exception as e:
        return None, repr(e)

print("settings:", call("/auth/v1/settings", method="GET"))

email = f"probe_{secrets.token_hex(4)}@ozon-tracker.local"
pw = secrets.token_urlsafe(18)
st, body = call("/auth/v1/signup", {"email": email, "password": pw})
print("signup status:", st)
if isinstance(body, dict):
    print("keys:", sorted(body.keys()))
    print("has_session:", bool(body.get("access_token")))
    print("confirmed_at:", body.get("confirmed_at") or (body.get("user") or {}).get("confirmed_at"))
    print("user_id:", (body.get("user") or {}).get("id") or body.get("id"))
else:
    print("body:", body)
print("PROBE_EMAIL", email)
