"""
Model Router — dynamically selects the best LLM based on task type.
Implements automatic API key rotation across multiple Google API keys
to handle free-tier rate limits gracefully.
"""
import os
import time
import threading
from enum import Enum
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# ── Load environment ─────────────────────────────────────────────────────────
if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    load_dotenv()


class TaskType(str, Enum):
    REQUIREMENT_ANALYSIS = "requirement_analysis"
    ARCHITECTURE_PLANNING = "architecture_planning"
    CODE_GENERATION = "code_generation"
    DEBUGGING = "debugging"
    TESTING = "testing"
    CRITIQUE = "critique"
    DOCUMENTATION = "documentation"
    MEMORY_SUMMARIZATION = "memory_summarization"
    CREATIVE_IDEATION = "creative_ideation"
    UI_GENERATION = "ui_generation"


# ── Routing table: task_type -> (model, max_tokens) ──────────────────────────
ROUTING_TABLE = {
    TaskType.REQUIREMENT_ANALYSIS:   ("gemini-2.5-flash", 4096),
    TaskType.ARCHITECTURE_PLANNING:  ("gemini-2.5-flash", 4096),
    TaskType.CODE_GENERATION:        ("gemini-2.5-flash", 8192),
    TaskType.DEBUGGING:              ("gemini-2.5-flash", 4096),
    TaskType.TESTING:                ("gemini-2.5-flash", 4096),
    TaskType.CRITIQUE:               ("gemini-2.5-flash", 2048),
    TaskType.DOCUMENTATION:          ("gemini-2.5-flash", 8192),
    TaskType.MEMORY_SUMMARIZATION:   ("gemini-2.5-flash", 2048),
    TaskType.CREATIVE_IDEATION:      ("gemini-2.5-flash", 4096),
    TaskType.UI_GENERATION:          ("gemini-2.5-flash", 4096),
}


# ── API Key Pool ─────────────────────────────────────────────────────────────
class KeyPool:
    """Rotates through multiple Google API keys to avoid per-key rate limits."""

    def __init__(self):
        self._keys = []
        self._index = 0
        self._lock = threading.Lock()
        self._load_keys()

    def _load_keys(self):
        # Primary key from GOOGLE_API_KEY
        primary = os.getenv("GOOGLE_API_KEY", "")
        if primary:
            self._keys.append(primary)
        # Additional keys from GOOGLE_API_KEY_2 .. GOOGLE_API_KEY_8
        for i in range(2, 9):
            k = os.getenv(f"GOOGLE_API_KEY_{i}", "")
            if k:
                self._keys.append(k)
        if not self._keys:
            print("[CRITICAL] No GOOGLE_API_KEY found in environment!")

    @property
    def size(self):
        return len(self._keys)

    def next_key(self) -> str:
        """Get the next API key in the rotation."""
        with self._lock:
            if not self._keys:
                return ""
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
            return key


# Singleton key pool
_key_pool = KeyPool()


def get_llm(task_type: TaskType, temperature: float = 0.0):
    """
    Returns a Google Gemini LLM client with automatic key rotation.
    Creates multiple clients (one per key) and chains them as fallbacks
    so that if one key is rate-limited, it automatically tries the next.
    """
    model, max_tokens = ROUTING_TABLE.get(task_type, ("gemini-2.5-flash", 4096))

    clients = []
    for _ in range(_key_pool.size):
        api_key = _key_pool.next_key()
        if not api_key:
            continue
        try:
            client = ChatGoogleGenerativeAI(
                model=model,
                temperature=temperature,
                max_output_tokens=max_tokens,
                google_api_key=api_key,
            )
            clients.append(client)
        except Exception as e:
            print(f"[Warning] Failed to create client with key: {e}")

    if not clients:
        raise RuntimeError("No working Google API keys configured. Set GOOGLE_API_KEY in .env")

    # Chain all clients as fallbacks for maximum resilience
    if len(clients) == 1:
        return clients[0]
    return clients[0].with_fallbacks(clients[1:])
