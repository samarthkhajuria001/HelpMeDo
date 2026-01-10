from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.ai.config import get_llm
from app.ai.context import build_user_context, get_user_goals
from app.ai.chains.intent_router import classify_intent
from app.ai.chains.magic_capture import parse_tasks, calculate_time_horizon
from app.schemas.ai import Intent
from datetime import datetime


GENERAL_CHAT_PROMPT = """You are Lufy, the AI assistant for HelpMeDo task management app.
You help users organize tasks and goals.

{user_context}

{custom_instructions}

RULES:
1. CRITICAL: Never exceed 150 words. Be concise and direct.
2. OFF-TOPIC: If user asks anything unrelated to tasks/goals/productivity (poems, trivia, coding, etc.), reply ONLY with: "I'm Lufy, your task assistant! I can help you create tasks, organize goals, and plan your day. What would you like to get done?"
3. For task creation, suggest: "Just tell me what you need to do, like 'buy milk, call mom tomorrow'."

User: {message}
Lufy:"""


def process_message(
    message: str,
    user_id: str,
    db: Session,
    client_date: str | None = None,
    custom_instructions: str | None = None
) -> dict:
    """
    Main entry point for processing AI chat messages.
    Returns dict with message, and optionally actions/action_type for confirmable operations.
    """
    classification = classify_intent(message)

    if classification.intent == Intent.MAGIC_CAPTURE:
        return handle_magic_capture(message, user_id, db, client_date)
    else:
        return handle_general_chat(message, user_id, db, custom_instructions)


def handle_magic_capture(
    message: str,
    user_id: str,
    db: Session,
    client_date: str | None
) -> dict:
    goals = get_user_goals(db, user_id)
    result = parse_tasks(message, goals, client_date)

    if not result.tasks:
        return {
            "message": result.message,
            "actions": None,
            "action_type": None
        }

    if client_date:
        try:
            current_date = datetime.strptime(client_date, "%Y-%m-%d")
        except ValueError:
            current_date = datetime.now()
    else:
        current_date = datetime.now()

    goal_map = {g.name: str(g.id) for g in goals}

    actions = []
    for task in result.tasks:
        time_horizon = calculate_time_horizon(task.due_date, current_date)
        goal_id = goal_map.get(task.goal_name) if task.goal_name else None

        actions.append({
            "title": task.title,
            "description": task.description,
            "priority": task.priority,
            "time_horizon": time_horizon,
            "due_date": task.due_date,
            "due_time": task.due_time,
            "goal_id": goal_id,
            "goal_name": task.goal_name
        })

    return {
        "message": result.message,
        "actions": actions,
        "action_type": "create_tasks"
    }


def handle_general_chat(
    message: str,
    user_id: str,
    db: Session,
    custom_instructions: str | None
) -> dict:
    user_context = build_user_context(db, user_id)

    instructions_block = ""
    if custom_instructions:
        instructions_block = f"Custom user instructions: {custom_instructions}"

    llm = get_llm(temperature=0.5)
    parser = StrOutputParser()

    prompt = ChatPromptTemplate.from_template(GENERAL_CHAT_PROMPT)
    chain = prompt | llm | parser

    response = chain.invoke({
        "message": message,
        "user_context": user_context,
        "custom_instructions": instructions_block
    })

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }
