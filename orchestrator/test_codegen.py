import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path="c:\\Users\\prane\\OneDrive\\Desktop\\DevAgents OS\\.env")

from agents.codegen_agent import codegen_node

def test_codegen():
    initial_state = {
        "session_id": "test-123",
        "project_id": "test-123",
        "raw_requirements": "build a simple calculator",
        "requirements": {
            "features": [{"id": "1", "title": "Add", "description": "addition"}]
        },
        "architecture": {
            "tech_stack": {"frontend": "vanilla html/js"}
        },
        "messages": [],
        "errors": [],
        "needs_refactor": False
    }

    print("Running codegen_node...")
    res = codegen_node(initial_state)
    print("\nResult:")
    print("code_files length:", len(res.get("code_files", [])))
    print("errors:", res.get("errors", []))
    print("messages:", json.dumps(res.get("messages", []), indent=2))

if __name__ == "__main__":
    test_codegen()
