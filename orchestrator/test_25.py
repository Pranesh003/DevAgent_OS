import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GOOGLE_API_KEY")
model = "models/gemini-2.5-flash" 

url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={key}"
payload = {
    "contents": [{"role": "user", "parts": [{"text": "Hi"}]}]
}

print(f"Testing key: {key[:10]}... with model: {model}")

try:
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Status: {response.status}")
except urllib.error.HTTPError as he:
    print(f"Error: {he.code}")
except Exception as e:
    print(f"Error: {e}")
