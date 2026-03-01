import os
import httpx
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
        res = httpx.get(f"{supabase_url}/rest/v1/projects?select=current_session_id,status,name&order=updated_at.desc&limit=1", headers=headers)
        session_id = res.json()[0].get('current_session_id')
        
        print(f"Session: {session_id}")
        act_res = httpx.get(f"{supabase_url}/rest/v1/activities?session_id=eq.{session_id}&select=agent_name,action,content&order=created_at.asc", headers=headers)
        acts = act_res.json()
        print(f"\n--- ALL {len(acts)} ACTIVITIES ---")
        for a in acts:
            content = a.get('content', '')
            # Truncate content for readability
            if len(content) > 100:
                content = content[:100] + "..."
            print(f"[{a.get('agent_name')}] {a.get('action')}: {content}")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check()
