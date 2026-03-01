"""
Supabase Vector Memory Store
Handles embedding generation and vector similarity search
for persistent agent memory across sessions.
"""
import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from openai import OpenAI

openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_supabase: Optional[Client] = None


def _get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _supabase = create_client(url, key)
    return _supabase


def _get_embedding(text: str) -> List[float]:
    """Generate text embedding using OpenAI text-embedding-3-small."""
    if not openai_client:
        print("[Warning] OPENAI_API_KEY not set. Returning dummy embedding.")
        return [0.0] * 1536
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding


def store_memory(
    content: str,
    memory_type: str,
    project_id: str,
    metadata: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Store content with its embedding in Supabase."""
    supabase = _get_supabase()
    embedding = _get_embedding(content)

    result = supabase.table("agent_memory").insert({
        "content": content,
        "type": memory_type,
        "project_id": project_id,
        "user_id": user_id,
        "metadata": metadata or {},
        "embedding": embedding,
    }).execute()

    return result.data[0] if result.data else {}


def search_memory(
    query: str,
    project_id: Optional[str] = None,
    match_count: int = 5,
    threshold: float = 0.7,
) -> List[Dict[str, Any]]:
    """Semantic search over stored memory using pgvector."""
    supabase = _get_supabase()
    query_embedding = _get_embedding(query)

    result = supabase.rpc("match_agent_memory", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": match_count,
        "filter_project_id": project_id,
    }).execute()

    return result.data or []
