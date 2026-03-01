from typing import TypedDict, List, Optional, Dict, Any

class AgentState(TypedDict):
    """
    Shared state across all LangGraph nodes in the Agents Unleashed workflow.
    """
    # Session metadata
    session_id: str
    project_id: str
    user_id: str
    iteration: int
    max_iterations: int

    # Input
    raw_requirements: str

    # Structured outputs per agent
    requirements: Optional[Dict[str, Any]]        # RequirementAgent output
    architecture: Optional[Dict[str, Any]]         # ArchitectureAgent output
    code_files: Optional[List[Dict[str, str]]]     # CodeGenAgent: list of {path, content, language}
    debug_output: Optional[Dict[str, Any]]         # DebugAgent output
    tests: Optional[List[Dict[str, str]]]          # TestingAgent output
    documentation: Optional[Dict[str, str]]        # DocumentationAgent output

    # Critique & refinement
    critique_score: Optional[float]               # 0-10
    critique_feedback: Optional[str]
    needs_refactor: bool

    # Memory & context
    memory_context: Optional[List[Dict[str, Any]]] # Retrieved memory entries
    reflections: Optional[List[str]]               # Memory agent summaries

    # Execution trace
    messages: List[Dict[str, str]]                 # {agent, content, timestamp}
    errors: List[str]

    # Control flow
    current_phase: str                             # current agent name
    completed: bool
