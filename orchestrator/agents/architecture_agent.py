"""
Architecture Planning Agent
Produces scalable system architecture, folder structure, API contracts,
and database schema using GPT-4o (structured reasoning).
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are a Principal Software Architect with deep expertise in distributed systems and MERN stack applications.
Given a structured requirements specification, produce a comprehensive architecture plan.

Respond with ONLY valid JSON:
{
  "system_overview": "string",
  "folder_structure": {
    "description": "string",
    "tree": "string (ASCII tree)"
  },
  "services": [
    {
      "name": "string",
      "type": "frontend|backend|database|cache|queue|ml",
      "technology": "string",
      "port": "number or null",
      "responsibilities": ["string"]
    }
  ],
  "api_contracts": [
    {
      "service": "string",
      "endpoints": [
        {
          "method": "GET|POST|PUT|DELETE|PATCH",
          "path": "string",
          "description": "string",
          "auth_required": "boolean",
          "request_body": "object or null",
          "response": "object"
        }
      ]
    }
  ],
  "database_schema": [
    {
      "collection": "string",
      "fields": [
        {"name": "string", "type": "string", "required": "boolean", "description": "string"}
      ],
      "indexes": ["string"]
    }
  ],
  "security_considerations": ["string"],
  "scalability_strategy": "string",
  "deployment_architecture": "string"
}"""


async def architecture_node(state: AgentState) -> AgentState:
    """LangGraph node: Architecture Planning Agent"""
    llm = get_llm(TaskType.ARCHITECTURE_PLANNING, temperature=0.1)

    req_summary = json.dumps(state.get("requirements", state["raw_requirements"]), indent=2)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"Design a production-grade architecture for this project:\n\n{req_summary}"
        ),
    ]

    try:
        response = await llm.ainvoke(messages)
        architecture = parse_llm_json(response.content)

        state["architecture"] = architecture
        state["messages"].append({
            "agent": "ArchitectureAgent",
            "content": f"Designed architecture with {len(architecture.get('services', []))} services "
                       f"and {len(architecture.get('api_contracts', []))} API groups.",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "codegen"

    except Exception as e:
        state["errors"].append(f"ArchitectureAgent error: {str(e)}")
        state["architecture"] = {"error": str(e)}
        state["current_phase"] = "codegen"

    return state
