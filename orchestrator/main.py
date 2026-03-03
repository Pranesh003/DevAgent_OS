"""
FastAPI Application — Agents Unleashed Orchestrator
Provides REST endpoints for triggering and monitoring agent workflows.
Routes streaming events back to the Node.js backend via webhook.
"""
import os
import asyncio
import httpx
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    load_dotenv() # Fallback to default behavior

from graph.workflow import workflow
from graph.state import AgentState

# ── In-memory session store ───────────────────────────────────────────────────
active_sessions: Dict[str, Dict] = {}

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")


# ── Schemas ────────────────────────────────────────────────────────────────────
class RunRequest(BaseModel):
    session_id: str
    project_id: str
    requirements: str
    user_id: Optional[str] = None
    options: Optional[Dict[str, Any]] = {}


class SessionStatus(BaseModel):
    session_id: str
    status: str
    current_phase: str
    iteration: int
    messages_count: int
    completed: bool
    errors: list


# ── App Lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Agents Unleashed Orchestrator starting...")
    yield
    print("Orchestrator shutting down.")


app = FastAPI(
    title="Agents Unleashed Orchestrator",
    description="LangGraph-powered multi-agent orchestration engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Event broadcaster ─────────────────────────────────────────────────────────
async def broadcast_event(session_id: str, event: Dict[str, Any]):
    """Send agent event to Node.js backend for SSE relay."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{BACKEND_URL}/api/agents/broadcast",
                json={"sessionId": session_id, "event": event},
            )
    except Exception as e:
        print(f"[Warning] Event broadcast failed: {e}")


# ── Streaming state wrapper ───────────────────────────────────────────────────
def make_event(agent: str, action: str, content: str, project_id: str, **kwargs) -> Dict:
    return {
        "agent": agent,
        "action": action,
        "content": content,
        "project_id": project_id,
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": kwargs,
    }


# ── Background workflow runner ────────────────────────────────────────────────
async def run_workflow_async(session_id: str, initial_state: AgentState):
    """Run the LangGraph workflow in background, streaming events at each step."""
    try:
        active_sessions[session_id]["status"] = "running"

        # Stream node-by-node updates
        current_state = initial_state.copy()
        async for chunk in workflow.astream(initial_state, stream_mode="updates"):
            for node_name, node_state in chunk.items():
                if node_state and isinstance(node_state, dict):
                    # Merge updates into our tracked full state
                    current_state.update(node_state)
                    
                    messages = current_state.get("messages", [])
                    latest = messages[-1] if messages else None
                    content = latest.get("content", f"Agent {node_name} completed") if latest else f"Completed {node_name}"

                    event = make_event(
                        agent=node_name,
                        action="output",
                        content=content,
                        project_id=current_state.get("project_id", ""),
                        phase=current_state.get("current_phase", node_name),
                        iteration=current_state.get("iteration", 0),
                        critique_score=current_state.get("critique_score"),
                    )
                    await broadcast_event(session_id, event)

                    # Update session store
                    active_sessions[session_id].update({
                        "current_phase": current_state.get("current_phase", node_name),
                        "iteration": current_state.get("iteration", 0),
                        "messages": current_state.get("messages", []),
                        "final_state": current_state.copy(),
                    })

        active_sessions[session_id]["status"] = "completed"
        # Include final state in the completion event for persistence
        final_state_serializable = {
            "project_id": initial_state["project_id"],
            "code_files": current_state.get("code_files") or [],
            "documentation": current_state.get("documentation") or {},
            "architecture": current_state.get("architecture") or {},
            "tests": current_state.get("tests") or [],
            "critique_score": current_state.get("critique_score"),
            "reflections": current_state.get("reflections") or [],
        }
        
        await broadcast_event(session_id, make_event(
            agent="System", action="complete",
            content="✅ All agents completed successfully.",
            project_id=initial_state["project_id"],
            **final_state_serializable
        ))

    except Exception as e:
        active_sessions[session_id]["status"] = "failed"
        active_sessions[session_id]["error"] = str(e)
        await broadcast_event(session_id, make_event(
            agent="System", action="error",
            content=f"❌ Workflow failed: {str(e)}",
            project_id=initial_state["project_id"],
        ))


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "orchestrator", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_agents(request: RunRequest, background_tasks: BackgroundTasks):
    """Trigger the agent workflow for given requirements."""
    if request.session_id in active_sessions and active_sessions[request.session_id].get("status") == "running":
        raise HTTPException(status_code=409, detail="Session already running")

    initial_state: AgentState = {
        "session_id": request.session_id,
        "project_id": request.project_id,
        "user_id": request.user_id or "",
        "iteration": 0,
        "max_iterations": request.options.get("max_iterations", 3),
        "raw_requirements": request.requirements,
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

    active_sessions[request.session_id] = {
        "status": "queued",
        "current_phase": "requirement",
        "iteration": 0,
        "messages": [],
        "final_state": None,
        "error": None,
    }

    background_tasks.add_task(run_workflow_async, request.session_id, initial_state)

    return {
        "success": True,
        "session_id": request.session_id,
        "message": "Workflow started",
    }


@app.get("/status/{session_id}")
async def get_status(session_id: str):
    """Get live workflow status for a session."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = active_sessions[session_id]
    return {
        "session_id": session_id,
        "status": session.get("status"),
        "current_phase": session.get("current_phase"),
        "iteration": session.get("iteration", 0),
        "messages_count": len(session.get("messages", [])),
        "completed": session.get("status") == "completed",
        "errors": [m for m in session.get("messages", []) if "error" in m.get("content", "").lower()],
        "traceback": session.get("error")
    }


@app.get("/results/{session_id}")
async def get_results(session_id: str):
    """Retrieve generated outputs for a session (partial or complete)."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = active_sessions[session_id]
    final = session.get("final_state") or {}
    
    code_files = final.get("code_files") or []
    documentation = final.get("documentation") or {}
    errors = final.get("errors") or []
    
    print(f"[Results] session={session_id} status={session.get('status')} phase={session.get('current_phase')} code_files={len(code_files)} docs={len(documentation)} errors={len(errors)}")
    
    return {
        "session_id": session_id,
        "status": session.get("status", "unknown"),
        "current_phase": session.get("current_phase", ""),
        "code_files": code_files,
        "tests": final.get("tests") or [],
        "documentation": documentation,
        "architecture": final.get("architecture") or {},
        "critique_score": final.get("critique_score"),
        "reflections": final.get("reflections") or [],
        "errors": errors,
    }


@app.get("/debug/sessions")
async def debug_sessions():
    """Debug endpoint to inspect all active sessions."""
    summary = {}
    for sid, session in active_sessions.items():
        final = session.get("final_state") or {}
        code_files = final.get("code_files") or []
        documentation = final.get("documentation") or {}
        errors = final.get("errors") or []
        summary[sid] = {
            "status": session.get("status"),
            "phase": session.get("current_phase"),
            "has_final_state": bool(session.get("final_state")),
            "code_files_count": len(code_files),
            "documentation_count": len(documentation),
            "errors": errors,
            "code_file_names": [f.get("path", f.get("filename", "?")) for f in code_files] if isinstance(code_files, list) else str(type(code_files)),
            "doc_file_names": list(documentation.keys()) if isinstance(documentation, dict) else str(type(documentation)),
        }
    return {"sessions": summary, "total": len(active_sessions)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("orchestrator.main:app", host="0.0.0.0", port=8000, reload=True)
