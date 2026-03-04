import os
import json
import urllib.request
from dotenv import load_dotenv
import time

load_dotenv()

keys = [os.getenv("GOOGLE_API_KEY")]
for i in range(2, 9):
    k = os.getenv(f"GOOGLE_API_KEY_{i}")
    if k:
        keys.append(k)

model = "models/gemini-2.0-flash" 

print(f"Testing {len(keys)} keys with model: {model}")

for i, key in enumerate(keys):
    url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Hi"}]}]
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                print(f"Key {i+1} ({key[:10]}...): WORKING")
                break
            else:
                print(f"Key {i+1}: Status {response.status}")
    except urllib.error.HTTPError as he:
        print(f"Key {i+1}: Error {he.code}")
    except Exception as e:
        print(f"Key {i+1}: Error {e}")
    
    time.sleep(0.5)
