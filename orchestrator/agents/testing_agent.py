"""
Testing Agent
Generates comprehensive unit and integration tests,
detects edge cases, and estimates coverage.
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are a Senior QA Engineer and Testing Specialist.

Generate comprehensive tests for the provided code. Respond with ONLY valid JSON:
{
  "test_files": [
    {
      "path": "tests/unit/example.test.js",
      "filename": "example.test.js",
      "type": "unit|integration|e2e",
      "framework": "jest|mocha|supertest|cypress",
      "content": "full test file content",
      "coverage_areas": ["string"]
    }
  ],
  "edge_cases_identified": ["string"],
  "estimated_coverage": "percentage string e.g. 85%",
  "testing_strategy": "string",
  "test_commands": {
    "unit": "npm test",
    "integration": "npm run test:integration",
    "coverage": "npm run test:coverage"
  },
  "summary": "string"
}

Guidelines:
- Jest + Supertest for Node.js backend API tests
- React Testing Library for frontend components
- Test happy paths, error paths, and edge cases
- Include auth-protected route tests
- Mock external services (MongoDB, Supabase)
"""


def testing_node(state: AgentState) -> AgentState:
    """LangGraph node: Testing Agent"""
    llm = get_llm(TaskType.TESTING, temperature=0.1)

    code_summary = ""
    if state.get("code_files"):
        for f in state["code_files"][:8]:
            snippet = f.get("content", "")[:1500]
            code_summary += f"\n\n=== {f.get('path')} ===\n{snippet}"

    if not code_summary:
        state["tests"] = []
        state["current_phase"] = "critique"
        return state

    debug_issues = json.dumps(
        state.get("debug_output", {}).get("issues", [])[:5], indent=2
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Generate tests for this codebase:

CODE FILES:
{code_summary}

KNOWN ISSUES TO TEST FOR:
{debug_issues}
"""
        ),
    ]

    try:
        response = llm.invoke(messages)
        test_output = parse_llm_json(response.content)

        test_files = test_output.get("test_files", [])
        state["tests"] = test_files
        state["messages"].append({
            "agent": "TestingAgent",
            "content": f"Generated {len(test_files)} test files. "
                       f"Estimated coverage: {test_output.get('estimated_coverage', 'N/A')}",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "critique"

    except Exception as e:
        state["errors"].append(f"TestingAgent error: {str(e)}")
        state["tests"] = []
        state["current_phase"] = "critique"

    return state
