import httpx
import time
import json

def test_run():
    sid = "test-129"
    payload = {
        "session_id": sid,
        "project_id": "proj-129",
        "requirements": "build a simple counter app"
    }
    print("Triggering run...")
    r = httpx.post("http://localhost:8000/run", json=payload)
    print("Run response:", r.json())
    
    while True:
        r2 = httpx.get(f"http://localhost:8000/status/{sid}")
        data = r2.json()
        print("Status:", data.get("status"), data.get("current_phase"))
        if data.get("status") in ["completed", "failed"]:
            print("FINISHED.")
            print("Errors:", data.get("errors"))
            print("Traceback:", data.get("traceback"))
            break
        time.sleep(2)

if __name__ == "__main__":
    test_run()
