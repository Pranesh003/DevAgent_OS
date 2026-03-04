"""
Model Router — dynamically selects the best LLM based on task type.
Implements automatic API key rotation across multiple Google API keys
to handle free-tier rate limits gracefully.
"""
import os
import time
import threading
import asyncio
from enum import Enum
from dotenv import load_dotenv

# Imported globally to prevent Python GIL deadlocks when evaluated inside LangGraph ThreadPools
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import Field
import json
import httpx
from typing import List, Optional, Any

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
    TaskType.REQUIREMENT_ANALYSIS:   ("models/gemini-2.0-flash", 4096),
    TaskType.ARCHITECTURE_PLANNING:  ("models/gemini-2.0-flash", 4096),
    TaskType.CODE_GENERATION:        ("models/gemini-2.0-flash", 8192),
    TaskType.DEBUGGING:              ("models/gemini-2.0-flash", 4096),
    TaskType.TESTING:                ("models/gemini-2.0-flash", 4096),
    TaskType.CRITIQUE:               ("models/gemini-2.0-flash", 2048),
    TaskType.DOCUMENTATION:          ("models/gemini-2.0-flash", 8192),
    TaskType.MEMORY_SUMMARIZATION:   ("models/gemini-2.0-flash", 2048),
    TaskType.CREATIVE_IDEATION:      ("models/gemini-2.0-flash", 4096),
    TaskType.UI_GENERATION:          ("models/gemini-2.0-flash", 4096),
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


class SyncRequestsGeminiModel(BaseChatModel):
    keys: List[str] = Field(description="Fallback API keys")
    model: str = Field(description="Model string")
    temperature: float = Field(description="Temperature")

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, run_manager=None, **kwargs) -> ChatResult:
        # Simple conversion of langchain messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg.type in ["human", "system", "user"] else "model"
            contents.append({"role": role, "parts": [{"text": str(msg.content)}]})
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
            }
        }
        if stop:
            payload["generationConfig"]["stopSequences"] = stop

        last_error = None
        import urllib.request
        import urllib.error

        for key in self.keys:
            # Ensure model starts with models/
            model_path = self.model if self.model.startswith("models/") else f"models/{self.model}"
            url = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent?key={key}"
            try:
                req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode('utf-8'))
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
            except urllib.error.HTTPError as he:
                if he.code == 429:
                    last_error = f"429 Quota Exceeded for {key[-5:]}"
                    time.sleep(1) # Brief sync wait
                    continue
                else:
                    last_error = f"{he.code}: {he.read().decode('utf-8')}"
            except Exception as e:
                last_error = str(e)
        
        # OpenAI Fallback if all Google API keys are exhausted
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            print("[Warning] Falling back to OpenAI gpt-4o-mini...")
            openai_url = "https://api.openai.com/v1/chat/completions"
            openai_payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user" if m.type in ["user", "human"] else "system", "content": str(m.content)} for m in messages],
                "temperature": self.temperature
            }
            if stop:
                openai_payload["stop"] = stop
            try:
                req = urllib.request.Request(openai_url, data=json.dumps(openai_payload).encode('utf-8'), headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                })
                with urllib.request.urlopen(req, timeout=30) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode('utf-8'))
                        text = data["choices"][0]["message"]["content"]
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
            except Exception as oe:
                print(f"[Error] OpenAI fallback failed: {oe}")
        
        # Ollama local fallback
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3")
        if ollama_url:
            print(f"[Warning] Falling back to local Ollama ({ollama_model})...")
            try:
                ollama_payload = {
                    "model": ollama_model,
                    "prompt": "\n".join([str(m.content) for m in messages]),
                    "stream": False,
                    "options": {"temperature": self.temperature}
                }
                req = urllib.request.Request(f"{ollama_url}/api/generate", data=json.dumps(ollama_payload).encode('utf-8'), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode('utf-8'))
                        text = data.get("response", "")
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
            except Exception as e:
                print(f"[Error] Ollama fallback failed: {e}")

        raise RuntimeError(f"All configured LLM providers (Google, OpenAI, Ollama) are exhausted. Last error: {last_error}")

    async def _agenerate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, run_manager=None, **kwargs) -> ChatResult:
        # Simple conversion of langchain messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg.type in ["human", "system", "user"] else "model"
            contents.append({"role": role, "parts": [{"text": str(msg.content)}]})
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
            }
        }
        if stop:
            payload["generationConfig"]["stopSequences"] = stop

        last_error = None
        async with httpx.AsyncClient(timeout=30.0) as client:
            for key in self.keys:
                model_path = self.model if self.model.startswith("models/") else f"models/{self.model}"
                url = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent?key={key}"
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
                    elif resp.status_code == 429:
                        last_error = f"429 Quota Exceeded for {key[-5:]}"
                        await asyncio.sleep(1.5)
                        continue
                except Exception as e:
                    last_error = repr(e)
            
            # OpenAI Fallback
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                openai_url = "https://api.openai.com/v1/chat/completions"
                openai_payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user" if m.type in ["user", "human"] else "system", "content": str(m.content)} for m in messages],
                    "temperature": self.temperature
                }
                try:
                    resp = await client.post(openai_url, headers={"Authorization": f"Bearer {openai_key}"}, json=openai_payload)
                    if resp.status_code == 200:
                        text = resp.json()["choices"][0]["message"]["content"]
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
                except Exception:
                    pass

            # Anthropic Fallback
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            if anthropic_key:
                anthropic_url = "https://api.anthropic.com/v1/messages"
                system_msg = next((m.content for m in messages if m.type == "system"), "")
                user_msgs = [{"role": "user", "content": str(m.content)} for m in messages if m.type in ["user", "human"]]
                anthropic_payload = {
                    "model": "claude-3-5-sonnet-latest",
                    "max_tokens": 4096,
                    "temperature": self.temperature,
                    "messages": user_msgs
                }
                if system_msg:
                    anthropic_payload["system"] = system_msg
                try:
                    resp = await client.post(anthropic_url, headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }, json=anthropic_payload)
                    if resp.status_code == 200:
                        text = resp.json().get("content", [{}])[0].get("text", "")
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
                except Exception:
                    pass

            # Ollama local fallback
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            ollama_model = os.getenv("OLLAMA_MODEL", "llama3")
            if ollama_url:
                try:
                    ollama_payload = {
                        "model": ollama_model,
                        "prompt": "\n".join([str(m.content) for m in messages]),
                        "stream": False
                    }
                    resp = await client.post(f"{ollama_url}/api/generate", json=ollama_payload, timeout=60.0)
                    if resp.status_code == 200:
                        text = resp.json().get("response", "")
                        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
                except Exception:
                    pass

        raise RuntimeError(f"All API Keys exhausted in async path. Last error: {last_error}")

    @property
    def _llm_type(self) -> str:
        return "sync-requests-gemini"


def get_llm(task_type: TaskType, temperature: float = 0.0):
    """
    Returns a Google Gemini LLM client with automatic key rotation.
    Creates multiple clients (one per key) and chains them as fallbacks
    so that if one key is rate-limited, it automatically tries the next.
    """
    model, max_tokens = ROUTING_TABLE.get(task_type, ("models/gemini-1.5-flash", 4096))

    return SyncRequestsGeminiModel(
        keys=_key_pool._keys.copy(),
        model=model,
        temperature=temperature
    )
