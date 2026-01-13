from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.ai.config import get_llm, get_checkpointer
from app.ai.context import build_user_context, get_user_goals
from app.ai.chains.intent_router import classify_intent
from app.ai.chains.magic_capture import parse_tasks, calculate_time_horizon
from app.ai.chains.librarian import answer_question
from app.ai.chains.reality_check import analyze_workload
from app.ai.chains.smart_review import generate_review
from app.ai.chains.stuck_breaker import break_down_task
from app.ai.graphs.deep_plan import get_compiled_graph
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
4. NEVER say "Done", "I've created", "I've added", or claim you performed any action. You CANNOT modify tasks or create subtasks in this mode.
5. If user asks to break down a task, tell them: "Say 'break down [task name]' and I'll help you create subtasks for it."
6. If user says "ok", "do it", "yes" or similar confirmation without context, ask what they'd like help with.

{conversation_history}
User: {message}
Lufy:"""


def format_history(history: list | None) -> str:
    if not history:
        return ""
    lines = ["Recent conversation:"]
    for msg in history[-5:]:
        role = "User" if msg.get("role") == "user" else "Lufy"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def process_message(
    message: str,
    user_id: str,
    db: Session,
    client_date: str | None = None,
    custom_instructions: str | None = None,
    history: list | None = None,
    session_id: str | None = None
) -> dict:
    """
    Main entry point for processing AI chat messages.
    Returns dict with message, and optionally actions/action_type for confirmable operations.
    """
    # Step 1: Check for active deep plan session (skip intent classification)
    if session_id:
        active_state = get_active_graph_state(session_id)
        if active_state:
            return resume_deep_plan(message, user_id, session_id)

    # Step 2: Classify intent for new messages
    classification = classify_intent(message)

    # Step 3: Route based on intent
    if classification.intent == Intent.DEEP_PLAN:
        if session_id:
            return start_deep_plan(message, user_id, session_id)
        else:
            return {"message": "I'd love to help you plan! Please refresh and try again.", "actions": None, "action_type": None}
    elif classification.intent == Intent.MAGIC_CAPTURE:
        return handle_magic_capture(message, user_id, db, client_date)
    elif classification.intent == Intent.LIBRARIAN:
        return answer_question(message, user_id, db, client_date)
    elif classification.intent == Intent.REALITY_CHECK:
        return analyze_workload(message, user_id, db, client_date)
    elif classification.intent == Intent.SMART_REVIEW:
        return generate_review(message, user_id, db, client_date)
    elif classification.intent == Intent.STUCK_BREAKER:
        return break_down_task(message, user_id, db, client_date)
    else:
        return handle_general_chat(message, user_id, db, custom_instructions, history)


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
    custom_instructions: str | None,
    history: list | None = None
) -> dict:
    user_context = build_user_context(db, user_id)

    instructions_block = ""
    if custom_instructions:
        instructions_block = f"Custom user instructions: {custom_instructions}"

    conversation_history = format_history(history)

    llm = get_llm(temperature=0.5)
    parser = StrOutputParser()

    prompt = ChatPromptTemplate.from_template(GENERAL_CHAT_PROMPT)
    chain = prompt | llm | parser

    response = chain.invoke({
        "message": message,
        "user_context": user_context,
        "custom_instructions": instructions_block,
        "conversation_history": conversation_history
    })

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }


def get_active_graph_state(session_id: str) -> dict | None:
    """
    Check for an active deep plan graph state in Redis.
    Returns the state values if found and still in progress, None otherwise.
    """
    try:
        checkpointer = get_checkpointer()
        graph = get_compiled_graph(checkpointer)
        config = {"configurable": {"thread_id": session_id}}

        state_snapshot = graph.get_state(config)
        if state_snapshot and state_snapshot.values:
            phase = state_snapshot.values.get("phase")
            if phase and phase not in ["ready", None]:
                return state_snapshot.values
    except Exception:
        pass

    return None


def start_deep_plan(message: str, user_id: str, session_id: str) -> dict:
    """Start a new deep plan graph execution."""
    try:
        checkpointer = get_checkpointer()
        graph = get_compiled_graph(checkpointer)

        initial_state = {
            "messages": [{"role": "user", "content": message}],
            "user_id": user_id,
            "session_id": session_id,
            "goal_intent": "",
            "user_constraints": {},
            "plan_data": None,
            "phase": "gathering",
            "iteration_count": 0,
            "needs_info": [],
            "final_message": None,
        }

        config = {"configurable": {"thread_id": session_id}}
        result = graph.invoke(initial_state, config)

        return extract_graph_response(result)

    except Exception as e:
        return {
            "message": f"I'm having trouble starting the planner. Please try again. ({str(e)[:50]})",
            "actions": None,
            "action_type": None
        }


def resume_deep_plan(message: str, _user_id: str, session_id: str) -> dict:
    """Resume an existing deep plan graph with new user input."""
    try:
        checkpointer = get_checkpointer()
        graph = get_compiled_graph(checkpointer)

        config = {"configurable": {"thread_id": session_id}}

        result = graph.invoke(
            {"messages": [{"role": "user", "content": message}]},
            config
        )

        return extract_graph_response(result)

    except Exception as e:
        return {
            "message": f"I lost track of our conversation. Let's start fresh - what would you like to plan? ({str(e)[:50]})",
            "actions": None,
            "action_type": None
        }


def extract_graph_response(result: dict) -> dict:
    """Extract response dict from graph result, including plan actions if available."""
    message = result.get("final_message") or "I'm working on your plan..."
    actions = None
    action_type = None

    plan_data = result.get("plan_data")
    phase = result.get("phase")

    if plan_data and phase in ["refining", "ready"]:
        action_type = "create_goal_plan"
        actions = plan_data

    return {
        "message": message,
        "actions": actions,
        "action_type": action_type
    }
