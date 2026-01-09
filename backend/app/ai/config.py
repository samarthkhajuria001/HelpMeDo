from langchain_openai import ChatOpenAI
from app.config import settings


def get_llm(model: str = "gpt-5-mini", temperature: float = 0.25):
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.OPENAI_API_KEY
    )