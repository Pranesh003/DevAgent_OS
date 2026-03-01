"""
Debugging Agent
Analyzes code for errors, performs root-cause reasoning,
suggests auto-fixes, and optimizes performance.
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are an expert Debugging and Code Review Agent.

Analyze the provided code files for:
1. Syntax errors
2. Logic bugs
3. Security vulnerabilities (XSS, SQL injection, broken auth, etc.)
4. Performance bottlenecks
5. Missing error handling
6. Memory leaks
7. Race conditions

Respond with ONLY valid JSON:
{
  "overall_quality": "poor|fair|good|excellent",
  "quality_score": 0-10,
  "issues": [
    {
      "id": "BUG-001",
      "severity": "critical|high|medium|low|info",
      "type": "bug|security|performance|style|missing_handling",
      "file": "path/to/file.js",
      "line_hint": "approximate line or null",
      "description": "clear description of the issue",
      "root_cause": "why this is a problem",
      "fix": "concrete code fix",
      "fixed_code": "the corrected code snippet"
    }
  ],
  "performance_suggestions": ["string"],
  "security_recommendations": ["string"],
  "summary": "string"
}
"""


def debug_node(state: AgentState) -> AgentState:
    """LangGraph node: Debugging Agent"""
    llm = get_llm(TaskType.DEBUGGING, temperature=0.1)

    code_summary = ""
    if state.get("code_files"):
        for f in state["code_files"][:10]:  # Limit to avoid token overflow
            snippet = f.get("content", "")[:2000]
            code_summary += f"\n\n=== {f.get('path')} ===\n{snippet}"

    if not code_summary:
        state["debug_output"] = {"issues": [], "summary": "No code to analyze"}
        state["current_phase"] = "testing"
        return state

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Review and debug this code:\n{code_summary}"),
    ]

    try:
        response = llm.invoke(messages)
        debug_output = parse_llm_json(response.content)

        # Apply fixes to code_files
        issues = debug_output.get("issues", [])
        critical_count = sum(1 for i in issues if i.get("severity") == "critical")

        state["debug_output"] = debug_output
        state["messages"].append({
            "agent": "DebugAgent",
            "content": f"Found {len(issues)} issues ({critical_count} critical). "
                       f"Quality score: {debug_output.get('quality_score', 'N/A')}/10",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "testing"

    except Exception as e:
        state["errors"].append(f"DebugAgent error: {str(e)}")
        state["debug_output"] = {"issues": [], "error": str(e)}
        state["current_phase"] = "testing"

    return state
