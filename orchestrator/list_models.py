import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GOOGLE_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

try:
    with urllib.request.urlopen(url, timeout=10) as response:
        data = json.loads(response.read().decode('utf-8'))
        models = [m['name'] for m in data.get("models", []) if "flash" in m['name'].lower() or "pro" in m['name'].lower()]
        for m in models:
            print(m)
except Exception as e:
    print(f"Error: {e}")
