import os
import json
import urllib.request
import time
from dotenv import load_dotenv

load_dotenv()

model = "models/gemini-2.0-flash" 

keys = []
if os.getenv("GOOGLE_API_KEY"): keys.append(os.getenv("GOOGLE_API_KEY").strip())
for i in range(2, 10):
    if os.getenv(f"GOOGLE_API_KEY_{i}"):
        keys.append(os.getenv(f"GOOGLE_API_KEY_{i}").strip())

print(f"Found {len(keys)} API keys to test.")

for idx, key in enumerate(keys):
    print(f"\n--- Testing Key {idx+1}: {key[:10]}... ---")
    url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Testing 2.0. Say 'Working'."}]}]
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"Status: {response.status} (SUCCESS)")
            data = json.loads(response.read().decode('utf-8'))
            print(f"Response: {data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(1) # Sleep to avoid instant rate limiting across valid keys
