"""
Documentation Agent
Writes README, API documentation, and onboarding guide using Claude
(optimized for long-context, high-quality prose generation).
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are a Technical Writer and Developer Experience (DX) expert.
Generate comprehensive, developer-friendly documentation.

Respond with ONLY valid JSON:
{
  "files": [
    {
      "filename": "README.md",
      "content": "full markdown content"
    },
    {
      "filename": "API_DOCS.md",
      "content": "full markdown API documentation"
    },
    {
      "filename": "ONBOARDING.md",
      "content": "step-by-step onboarding guide"
    }
  ],
  "summary": "string"
}

README must include: Project overview, Features, Architecture diagram (ASCII), Tech stack, Prerequisites, Installation, Environment setup, Running locally, API overview, Deployment, Contributing.
API_DOCS must include: Authentication, all endpoints with request/response examples.
ONBOARDING must include: Getting started in 5 minutes, Common workflows, Troubleshooting.
"""


async def documentation_node(state: AgentState) -> AgentState:
    """LangGraph node: Documentation Agent"""
    llm = get_llm(TaskType.DOCUMENTATION, temperature=0.2)

    req = json.dumps(state.get("requirements", {}), indent=2)[:2000]
    arch = json.dumps(state.get("architecture", {}), indent=2)[:2000]
    api_contracts = json.dumps(
        state.get("architecture", {}).get("api_contracts", [])[:3], indent=2
    )
    file_list = [f.get("path") for f in (state.get("code_files") or [])[:20]]

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Generate full documentation for this project:

REQUIREMENTS SUMMARY:
{req}

ARCHITECTURE:
{arch}

API CONTRACTS:
{api_contracts}

GENERATED FILES:
{json.dumps(file_list, indent=2)}

CRITIQUE SCORE: {state.get('critique_score', 'N/A')}/10
"""
        ),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content
        
        try:
            doc_output = parse_llm_json(content)
            # Standard JSON format: {"files": [{"filename": ..., "content": ...}]}
            if isinstance(doc_output, dict) and "files" in doc_output:
                doc_files = {f["filename"]: f["content"] for f in doc_output.get("files", [])}
            elif isinstance(doc_output, dict):
                # Maybe keys are filenames
                doc_files = {}
                for key, val in doc_output.items():
                    if isinstance(val, str):
                        doc_files[key] = val
                    elif isinstance(val, dict) and "content" in val:
                        doc_files[key] = val["content"]
            else:
                doc_files = {"README.md": content}
        except (ValueError, json.JSONDecodeError):
            # If JSON parsing fails, treat the entire output as a README
            doc_files = {"README.md": content}

        state["documentation"] = doc_files
        state["messages"].append({
            "agent": "DocumentationAgent",
            "content": f"Generated {len(doc_files)} documentation files: {', '.join(doc_files.keys())}",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "memory"

    except Exception as e:
        state["errors"].append(f"DocumentationAgent error: {str(e)}")
        state["documentation"] = {}
        state["current_phase"] = "memory"

    return state
