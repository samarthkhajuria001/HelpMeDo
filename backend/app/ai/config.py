import os
from langchain_openai import ChatOpenAI
from app.config import settings

# Ensure LangChain environment variables are set for tracing
if settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true" if settings.LANGCHAIN_TRACING_V2 else "false"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT


def get_llm(model: str = "gpt-5-nano", temperature: float = 0.25):
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.OPENAI_API_KEY
    )


_redis_client = None


def get_redis_client():
    """Get or create Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        import redis
        _redis_client = redis.from_url(settings.REDIS_URL)
    return _redis_client


_checkpointer = None


def get_checkpointer():
    """Get or create LangGraph checkpointer singleton.

    Uses MemorySaver for simplicity (state lost on restart).
    For production, use Redis with proper async context management.
    """
    global _checkpointer
    if _checkpointer is None:
        from langgraph.checkpoint.memory import MemorySaver
        _checkpointer = MemorySaver()
    return _checkpointer


def clear_graph_state(session_id: str) -> bool:
    """Clear LangGraph state for a session. Returns True if cleared."""
    try:
        client = get_redis_client()
        pattern = f"*{session_id}*"
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
        return True
    except Exception:
        return False