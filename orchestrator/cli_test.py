print("STARTING CLI TEST", flush=True)
from graph.workflow import workflow
print("Imported workflow", flush=True)
from graph.state import AgentState
print("Imported AgentState", flush=True)
initial_state: AgentState = {
    "session_id": "cli-test-01",
    "project_id": "test-pid",
    "user_id": "test-uid",
    "iteration": 0,
    "max_iterations": 1,
    "raw_requirements": "Build a simple snake game in HTML and JS.",
    "requirements": None,
    "architecture": None,
    "code_files": None,
    "debug_output": None,
    "tests": None,
    "documentation": None,
    "critique_score": None,
    "critique_feedback": None,
    "needs_refactor": False,
    "memory_context": None,
    "reflections": None,
    "messages": [],
    "errors": [],
    "current_phase": "requirement",
    "completed": False,
}

import asyncio

print("Invoking LangGraph locally...", flush=True)
async def run_test():
    try:
        result = await workflow.ainvoke(initial_state)
        print("Success!", result.get("errors"), flush=True)
    except Exception as e:
        print(f"Workflow CRASHED: {e}", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())

print("FINISHED CLI SCRIPT", flush=True)
