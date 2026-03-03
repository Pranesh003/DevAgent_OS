"""
LangGraph Workflow — Main Orchestration Graph
Implements the continuous improvement loop:
Requirement → Architecture → CodeGen → Debug → Testing → Critique → [Refactor?] → Documentation → Memory
"""
from langgraph.graph import StateGraph, END
from graph.state import AgentState
from agents.requirement_agent import requirement_node
from agents.architecture_agent import architecture_node
from agents.codegen_agent import codegen_node
from agents.debug_agent import debug_node
from agents.testing_agent import testing_node
from agents.critique_agent import critique_node, should_refactor
from agents.documentation_agent import documentation_node
from agents.memory_agent import memory_node


async def increment_iteration(state: AgentState) -> AgentState:
    """Increment iteration counter when entering refactor loop."""
    state["iteration"] = state.get("iteration", 0) + 1
    state["current_phase"] = "codegen"
    return state


def build_workflow() -> StateGraph:
    """
    Construct the LangGraph StateGraph for the Agents Unleashed workflow.
    Returns a compiled graph ready for execution.
    """
    graph = StateGraph(AgentState)

    # ── Register Nodes ──────────────────────────────────────────────────────
    graph.add_node("requirement", requirement_node)
    graph.add_node("architecture", architecture_node)
    graph.add_node("codegen", codegen_node)
    graph.add_node("debug", debug_node)
    graph.add_node("testing", testing_node)
    graph.add_node("critique", critique_node)
    graph.add_node("increment_iteration", increment_iteration)
    graph.add_node("documentation", documentation_node)
    graph.add_node("memory", memory_node)

    # ── Define Edges (Main Pipeline) ─────────────────────────────────────────
    graph.set_entry_point("requirement")
    graph.add_edge("requirement", "architecture")
    graph.add_edge("architecture", "codegen")
    graph.add_edge("codegen", "debug")
    
    # ── Sequential Execution Pipeline ─────────────────────────────────────────
    graph.add_edge("debug", "testing")
    graph.add_edge("testing", "documentation")
    graph.add_edge("documentation", "memory")
    graph.add_edge("memory", END)

    return graph.compile()


# Singleton compiled workflow
workflow = build_workflow()
