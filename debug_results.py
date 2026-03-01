import os
import httpx
import json
from dotenv import load_dotenv

def check():
    load_dotenv(dotenv_path="c:\\Users\\prane\\OneDrive\\Desktop\\DevAgents OS\\.env")
    supabase_url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}"
    }

    try:
        # Get latest project session
        res = httpx.get(f"{supabase_url}/rest/v1/projects?select=current_session_id,status,name&order=updated_at.desc&limit=1", headers=headers)
        data = res.json()
        if not data:
            print("No projects found")
            return
        
        session_id = data[0].get('current_session_id')
        print(f"Latest Session: {session_id}")

        # Check Node Backend Results Proxy
        try:
            node_res = httpx.get(f"http://localhost:5000/api/agents/results/{session_id}")
            print(f"Node Backend Status: {node_res.status_code}")
            node_data = node_res.json()
            if node_res.status_code == 200:
                inner_data = node_data.get('data', {})
                code = inner_data.get('code_files')
                docs = inner_data.get('documentation')
                print(f"Node payload -> code_files type: {type(code)}, documentation type: {type(docs)}")
                if isinstance(code, list):
                    print(f"Node payload -> code_files length: {len(code)}")
            else:
                print("Node Response:", node_res.text)
        except Exception as e:
            print(f"Node fetch error: {e}")

        print("\n" + "="*40 + "\n")

        # Check Orchestrator Results directly
        try:
            orc_res = httpx.get(f"http://localhost:8000/results/{session_id}")
            print(f"Orchestrator Status: {orc_res.status_code}")
            orc_data = orc_res.json()
            if orc_res.status_code == 200:
                print("Orchestrator Keys:", orc_data.keys())
                code = orc_data.get('code_files')
                docs = orc_data.get('documentation')
                print(f"Orc payload -> code_files type: {type(code)}")
                if isinstance(code, list) and len(code) > 0:
                     print(f"First code file keys: {code[0].keys() if isinstance(code[0], dict) else 'Not a dict'}")
                print(f"Orc payload -> documentation type: {type(docs)}")
                if isinstance(docs, dict):
                    print(f"Documentation keys: {list(docs.keys())}")
            else:
                print("Orchestrator Response:", orc_res.text)
        except Exception as e:
            print(f"Orchestrator fetch error: {e}")
            
    except Exception as e:
        print("Fatal Error:", e)

if __name__ == "__main__":
    check()
