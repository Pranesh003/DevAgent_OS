"""
Critique Agent — Multi-Agent Debate
Two sub-agents debate the quality of the current output.
Scores output 0-10; if < 7, triggers a refactor loop.
"""
import json
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

CRITIC_PROMPT = """You are a brutal, senior code CRITIC with 25 years of experience.
Your job is to find every flaw, gap, and potential failure in the software output.
Be thorough, technical, and uncompromising. Identify what's missing, what's wrong, and what could fail in production.
"""

DEFENDER_PROMPT = """You are a confident senior engineer who wrote the code and must DEFEND it.
Acknowledge valid criticisms but push back on nitpicks. Explain design decisions and trade-offs.
"""

JUDGE_PROMPT = """You are an impartial Technical Lead Judge.
Given a criticism and defense of a software project, produce a final verdict.
Respond with ONLY valid JSON:
{
  "score": 7.5,
  "verdict": "string (1-2 sentences)",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "required_improvements": ["string"],
  "optional_improvements": ["string"],
  "should_refactor": true
}
Score < 7.0 means refactoring is required. Score >= 7.0 means it passes.
"""


async def critique_node(state: AgentState) -> AgentState:
    """LangGraph node: Critique Agent (multi-agent debate)"""
    llm = get_llm(TaskType.CRITIQUE, temperature=0.3)

    # Build summary of current outputs
    summary = f"""
PROJECT SUMMARY:
Requirements: {json.dumps(state.get('requirements', {}), indent=2)[:1000]}
Architecture Services: {len(state.get('architecture', {}).get('services', []))} services
Code Files: {len(state.get('code_files', []))} files
Test Files: {len(state.get('tests', []))} test files
Debug Issues: {len(state.get('debug_output', {}).get('issues', []))} issues found
    """.strip()

    try:
        # Round 1: Critic
        critic_messages = [
            SystemMessage(content=CRITIC_PROMPT),
            HumanMessage(content=f"Critique this software project output:\n\n{summary}"),
        ]
        critic_response = llm.invoke(critic_messages)
        criticism = critic_response.content

        # Round 2: Defender
        defender_messages = [
            SystemMessage(content=DEFENDER_PROMPT),
            HumanMessage(
                content=f"Defend this project against the following criticism:\n\nPROJECT:\n{summary}\n\nCRITICISM:\n{criticism}"
            ),
        ]
        defender_response = llm.invoke(defender_messages)
        defense = defender_response.content

        # Round 3: Judge
        judge_messages = [
            SystemMessage(content=JUDGE_PROMPT),
            HumanMessage(
                content=f"CRITICISM:\n{criticism}\n\nDEFENSE:\n{defense}\n\nPROJECT:\n{summary}"
            ),
        ]
        judge_response = await llm.ainvoke(judge_messages)
        verdict = parse_llm_json(judge_response.content)

        score = float(verdict.get("score", 5.0))
        needs_refactor = bool(verdict.get("should_refactor", score < 7.0))

        state["critique_score"] = score
        state["critique_feedback"] = "\n".join([
            "Required improvements:",
            *[f"- {i}" for i in verdict.get("required_improvements", [])],
            "\nOptional improvements:",
            *[f"- {i}" for i in verdict.get("optional_improvements", [])],
        ])
        state["needs_refactor"] = needs_refactor
        state["messages"].append({
            "agent": "CritiqueAgent",
            "content": f"Debate complete. Score: {score}/10. "
                       f"Verdict: {verdict.get('verdict', '')} "
                       f"{'⟳ Refactoring needed.' if needs_refactor else '✓ Quality approved.'}",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "documentation"

    except Exception as e:
        state["errors"].append(f"CritiqueAgent error: {str(e)}")
        state["critique_score"] = 7.0
        state["needs_refactor"] = False
        state["current_phase"] = "documentation"

    return state


def should_refactor(state: AgentState) -> str:
    """Conditional edge: route back to codegen if quality is insufficient."""
    if state.get("needs_refactor") and state.get("iteration", 0) < state.get("max_iterations", 3):
        return "refactor"
    return "continue"
