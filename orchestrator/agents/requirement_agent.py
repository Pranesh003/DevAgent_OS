"""
Requirement Understanding Agent
Extracts structured features, constraints, priorities, and user stories
from natural language requirements using Claude (long-context reasoning).
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are an elite Requirements Engineering Agent with 20+ years experience.
Your task is to analyze raw software requirements and produce a comprehensive, structured analysis.

You MUST respond with ONLY valid JSON in the following format:
{
  "project_name": "string",
  "project_summary": "string",
  "features": [
    {
      "id": "F-001",
      "title": "string",
      "description": "string",
      "priority": "critical|high|medium|low",
      "complexity": "simple|medium|complex",
      "acceptance_criteria": ["string"]
    }
  ],
  "constraints": [
    {"type": "technical|business|time|security", "description": "string"}
  ],
  "tech_stack_recommendations": {
    "frontend": "string",
    "backend": "string",
    "database": "string",
    "deployment": "string"
  },
  "user_personas": [
    {"name": "string", "role": "string", "goals": ["string"], "pain_points": ["string"]}
  ],
  "risk_factors": [
    {"risk": "string", "likelihood": "high|medium|low", "mitigation": "string"}
  ],
  "mvp_scope": ["string"],
  "estimated_phases": [
    {"phase": "string", "duration": "string", "deliverables": ["string"]}
  ]
}"""


async def requirement_node(state: AgentState) -> AgentState:
    """LangGraph node: Requirement Understanding Agent"""
    llm = get_llm(TaskType.REQUIREMENT_ANALYSIS, temperature=0.1)

    # 1. Skip memory retrieval to prevent httpx deadlocks
    memories = []
    # try:
    #     from memory.supabase_store import search_memory
    #     # Search for similar requirements or past projects
    #     memories = search_memory(state['raw_requirements'], limit=3)
    # except Exception as e:
    #     state["errors"].append(f"Memory retrieval failed: {str(e)}")

    memory_context = ""
    if memories:
        memory_context = "\n\n### RELEVANT PAST KNOWLEDGE:\n"
        for m in memories:
            memory_context += f"- [{m.get('type')}] {m.get('content')}\n"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT + (f"\n\nCONSIDER PREVIOUS CONTEXT:\n{memory_context}" if memory_context else "")),
        HumanMessage(
            content=f"Analyze these requirements and extract a structured specification:\n\n{state['raw_requirements']}"
        ),
    ]

    try:
        response = await llm.ainvoke(messages)
        requirements = parse_llm_json(response.content)

        state["requirements"] = requirements
        state["messages"].append({
            "agent": "RequirementAgent",
            "content": f"Extracted {len(requirements.get('features', []))} features, "
                       f"{len(requirements.get('constraints', []))} constraints.",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "architecture"

    except Exception as e:
        state["errors"].append(f"RequirementAgent error: {str(e)}")
        state["requirements"] = {"raw": state["raw_requirements"], "parse_error": str(e)}
        state["current_phase"] = "architecture"

    return state
