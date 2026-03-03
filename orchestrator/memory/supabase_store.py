"""
Supabase Vector Memory Store
Handles embedding generation and vector similarity search
for persistent agent memory across sessions.
"""
import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from langchain_google_genai import GoogleGenerativeAIEmbeddings

_embeddings: Optional[GoogleGenerativeAIEmbeddings] = None

def _get_embeddings_client() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY must be set for embeddings")
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key,
            task_type="retrieval_document",
            output_dimensionality=768
        )
    return _embeddings


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
    """Generate text embedding using Google Gemini text-embedding-004."""
    client = _get_embeddings_client()
    return client.embed_query(text[:8000])


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
