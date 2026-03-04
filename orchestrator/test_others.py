import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
anthropic_key = os.getenv("ANTHROPIC_API_KEY")

print("--- Testing OpenAI ---")
if openai_key:
    try:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 10
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"OpenAI Status: {response.status}")
    except Exception as e:
        print(f"OpenAI Error: {e}")
else:
    print("OpenAI key missing")

print("\n--- Testing Anthropic ---")
if anthropic_key:
    try:
        url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Hi"}]
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"Anthropic Status: {response.status}")
    except Exception as e:
        print(f"Anthropic Error: {e}")
else:
    print("Anthropic key missing")
