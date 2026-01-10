from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.ai.config import get_llm
from app.ai.context import build_user_context


LIBRARIAN_PROMPT = """You are Lufy, a helpful task assistant. Answer the user's question based on their task data.

{user_context}

CURRENT DATE: {current_date}

RULES:
1. Only reference tasks that actually exist in the data above
2. If no matching tasks found, say so politely and offer to create one
3. For date questions, calculate relative to current date
4. Include relevant details (due date, priority, goal) when helpful
5. Keep response under 150 words
6. Be conversational but concise

User question: {question}
Answer:"""


def answer_question(
    question: str,
    user_id: str,
    db: Session,
    client_date: str | None = None
) -> dict:
    """Answer a question about user's tasks using the Librarian chain."""
    user_context = build_user_context(db, user_id)

    if client_date:
        current_date = client_date
    else:
        from datetime import datetime
        current_date = datetime.now().strftime("%Y-%m-%d")

    llm = get_llm(temperature=0.3)
    parser = StrOutputParser()

    prompt = ChatPromptTemplate.from_template(LIBRARIAN_PROMPT)
    chain = prompt | llm | parser

    response = chain.invoke({
        "user_context": user_context,
        "current_date": current_date,
        "question": question
    })

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }
