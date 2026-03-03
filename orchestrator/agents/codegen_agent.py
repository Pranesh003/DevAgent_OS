"""
Code Generation Agent
Generates production-ready code across multiple files.
Includes bulletproof fallback: extracts code blocks from raw text if JSON parsing fails.
"""
import json
import re
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from routing.model_router import get_llm, TaskType
from graph.state import AgentState
from utils.json_parser import parse_llm_json

SYSTEM_PROMPT = """You are an elite Full-Stack Software Engineer.

Generate complete, working code for the required files. You MUST respond with valid JSON:
{
  "files": [
    {
      "path": "relative/path/to/file.js",
      "filename": "file.js",
      "language": "javascript",
      "content": "full file content here"
    }
  ],
  "summary": "what was generated"
}

Rules:
- Write complete, production-ready code (not pseudocode)
- Include proper error handling and input validation
- Never use placeholder comments like "// TODO: implement this"
"""


def _guess_lang(path: str) -> str:
    """Guess programming language from file extension."""
    ext_map = {
        ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
        ".py": "python", ".css": "css", ".html": "html", ".json": "json",
        ".md": "markdown", ".yml": "yaml", ".yaml": "yaml", ".env": "shell",
        ".sh": "bash", ".sql": "sql", ".graphql": "graphql",
    }
    for ext, lang in ext_map.items():
        if path.endswith(ext):
            return lang
    return "javascript"


def _extract_files_from_json(parsed) -> list:
    """Extract file list from various JSON structures."""
    files = []
    if isinstance(parsed, dict):
        files = parsed.get("files", [])
        if not files:
            for key, val in parsed.items():
                if key in ("summary", "dependencies", "setup_commands", "description"):
                    continue
                if isinstance(val, str) and len(val) > 20:
                    files.append({"path": key, "filename": key.split("/")[-1], "language": _guess_lang(key), "content": val})
                elif isinstance(val, dict) and "content" in val:
                    files.append({"path": key, "filename": key.split("/")[-1], "language": val.get("language", _guess_lang(key)), "content": val["content"]})
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and ("content" in item or "code" in item):
                            files.append({
                                "path": item.get("path", item.get("filename", "unknown")),
                                "filename": item.get("filename", item.get("path", "unknown").split("/")[-1]),
                                "language": item.get("language", "javascript"),
                                "content": item.get("content", item.get("code", "")),
                            })
    elif isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, dict):
                files.append({
                    "path": item.get("path", item.get("filename", "unknown")),
                    "filename": item.get("filename", item.get("path", "unknown").split("/")[-1]),
                    "language": item.get("language", "javascript"),
                    "content": item.get("content", item.get("code", "")),
                })
    return files


def _extract_code_blocks_from_text(raw_text: str) -> list:
    """
    Fallback: extract fenced code blocks from raw LLM text.
    Handles patterns like:
      ```javascript
      // code here
      ```
    or:
      **filename.js**
      ```js
      // code
      ```
    """
    files = []
    # Pattern: ```language\n...code...\n```
    pattern = r'(?:(?:\*\*|#+\s*|`)?([a-zA-Z0-9_./\-]+(?:\.[a-zA-Z]+))`?\*?\*?\s*\n)?```(\w+)?\n(.*?)```'
    matches = re.findall(pattern, raw_text, re.DOTALL)

    lang_ext = {"js": ".js", "javascript": ".js", "jsx": ".jsx", "ts": ".ts", "typescript": ".ts",
                "tsx": ".tsx", "python": ".py", "py": ".py", "css": ".css", "html": ".html",
                "json": ".json", "yaml": ".yml", "yml": ".yml", "bash": ".sh", "shell": ".sh",
                "sql": ".sql", "markdown": ".md", "md": ".md"}

    for i, (filename, lang, code) in enumerate(matches):
        if not code.strip():
            continue
        lang = lang.strip().lower() if lang else "javascript"
        if not filename or filename == lang:
            ext = lang_ext.get(lang, ".js")
            filename = f"generated_file_{i + 1}{ext}"
        files.append({
            "path": filename,
            "filename": filename.split("/")[-1],
            "language": lang,
            "content": code.strip(),
        })

    return files


async def codegen_node(state: AgentState) -> AgentState:
    """LangGraph node: Code Generation Agent"""
    llm = get_llm(TaskType.CODE_GENERATION, temperature=0.2)

    req = json.dumps(state.get("requirements", {}), indent=2)[:3000]
    arch = json.dumps(state.get("architecture", {}), indent=2)[:3000]

    refactor_hint = ""
    if state.get("needs_refactor") and state.get("critique_feedback"):
        refactor_hint = f"\n\nIMPORTANT: Apply these improvements:\n{state['critique_feedback']}"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Generate production-ready code based on:

REQUIREMENTS:
{req}

ARCHITECTURE:
{arch}
{refactor_hint}

Generate all necessary files for a working application.
"""
        ),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw_content = response.content
        print(f"[CodeGen] Raw response length: {len(raw_content)}")

        # Strategy 1: Parse as JSON
        files = []
        try:
            parsed = parse_llm_json(raw_content)
            files = _extract_files_from_json(parsed)
            print(f"[CodeGen] JSON parse produced {len(files)} files")
        except Exception as parse_err:
            print(f"[CodeGen] JSON parse failed: {parse_err}")

        # Strategy 2: Extract code blocks from raw text
        if not files:
            files = _extract_code_blocks_from_text(raw_content)
            print(f"[CodeGen] Code block extraction produced {len(files)} files")

        # Strategy 3: If still nothing, wrap the entire response as a single file
        if not files and len(raw_content) > 50:
            files = [{
                "path": "generated_output.md",
                "filename": "generated_output.md",
                "language": "markdown",
                "content": raw_content,
            }]
            print(f"[CodeGen] Wrapped entire response as single markdown file")

        state["code_files"] = files
        state["needs_refactor"] = False
        state["messages"].append({
            "agent": "CodeGenAgent",
            "content": f"Generated {len(files)} files.",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["current_phase"] = "debug"

    except Exception as e:
        print(f"[CodeGen] CRITICAL ERROR: {e}")
        state["errors"].append(f"CodeGenAgent error: {str(e)}")
        state["code_files"] = []
        state["current_phase"] = "debug"

    return state
