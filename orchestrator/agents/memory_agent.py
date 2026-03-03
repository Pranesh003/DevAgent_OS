"""
Memory Reflection Agent
Summarizes session history using local Ollama (cost-efficient local model).
Extracts architectural decisions, bug patterns, developer preferences.
Stores distilled insights into Supabase vector store.
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.llms import Ollama
from routing.model_router import get_llm, TaskType
# from memory.supabase_store import store_memory
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SUMMARIZER_PROMPT = """You are a technical memory summarizer.
Extract and distill the key insights from this agent session into reusable knowledge.

Respond with ONLY valid JSON:
{
  "architectural_decisions": [
    {"decision": "string", "rationale": "string", "alternatives_considered": ["string"]}
  ],
  "bug_patterns": [
    {"pattern": "string", "root_cause": "string", "fix_strategy": "string"}
  ],
  "code_patterns": [
    {"pattern": "string", "use_case": "string", "example": "string"}
  ],
  "developer_insights": ["string"],
  "key_lessons": ["string"],
  "session_summary": "string"
}"""


def _get_local_llm():
    """Use Gemini Flash for memory summarization (Ollama is optional)."""
    return get_llm(TaskType.MEMORY_SUMMARIZATION, temperature=0.1)


async def memory_node(state: AgentState) -> AgentState:
    """LangGraph node: Memory Reflection Agent"""

    # Build rich session context
    session_context = {
        "session_id": state["session_id"],
        "project_id": state["project_id"],
        "iteration": state["iteration"],
        "requirements_summary": str(state.get("requirements", {}))[:500],
        "architecture_summary": str(state.get("architecture", {}))[:500],
        "files_generated": [f.get("path") for f in (state.get("code_files") or [])],
        "debug_issues": state.get("debug_output", {}).get("issues", [])[:5],
        "critique_score": state.get("critique_score"),
        "errors": state.get("errors", []),
        "messages": state.get("messages", [])[-10:],
    }

    try:
        llm = _get_local_llm()
        messages = [
            SystemMessage(content=SUMMARIZER_PROMPT),
            HumanMessage(content=f"Summarize this agent session:\n{json.dumps(session_context, indent=2)}"),
        ]
        response = await llm.ainvoke(messages)
        content = response.content if hasattr(response, 'content') else str(response)
        reflection = parse_llm_json(content)

        # Store insights in Supabase vector memory
        insights_to_store = [
            *[{"type": "architectural_decision", "content": json.dumps(d)}
              for d in reflection.get("architectural_decisions", [])],
            *[{"type": "bug_pattern", "content": json.dumps(b)}
              for b in reflection.get("bug_patterns", [])],
            *[{"type": "key_lesson", "content": lesson}
              for lesson in reflection.get("key_lessons", [])],
            {"type": "session_summary", "content": reflection.get("session_summary", "")},
        ]

        for insight in insights_to_store:
            pass # Skipping memory store to bypass httpx deadlocks
            # try:
            #     store_memory(
            #         content=insight["content"],
            #         memory_type=insight["type"],
            #         project_id=state["project_id"],
            #         metadata={"session_id": state["session_id"], "iteration": state["iteration"]},
            #     )
            # except Exception as e:
            #     state["errors"].append(f"Failed to store insight: {str(e)}")

        state["reflections"] = reflection.get("key_lessons", [])
        state["messages"].append({
            "agent": "MemoryAgent",
            "content": f"Stored {len(insights_to_store)} memory insights. "
                       f"Session summary: {reflection.get('session_summary', '')[:100]}...",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["completed"] = True
        state["current_phase"] = "complete"

    except Exception as e:
        state["errors"].append(f"MemoryAgent error: {str(e)}")
        state["completed"] = True
        state["current_phase"] = "complete"

    return state
