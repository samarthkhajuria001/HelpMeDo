from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.ai.config import get_llm
from app.schemas.ai import Intent, IntentClassification


INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a task management app.
Classify the user's message into one of these intents:

MAGIC_CAPTURE: User wants to create one or more CONCRETE, ACTIONABLE tasks.
Signs: Contains specific action items, comma-separated tasks, "add", "create", "remind me", "todo"
Examples: "buy milk, fix bike", "add call mom to my list", "remind me to pay rent", "todo: finish report"
NOT deep_plan: These are simple tasks that don't need planning or breakdown.

DEEP_PLAN: User wants to achieve a complex GOAL that requires multi-step planning.
Signs: Abstract goals, learning objectives, "I want to learn/achieve/master", "plan my...", "prepare for...", long-term aspirations, skill acquisition
Examples: "I want to learn Japanese", "plan my marathon training", "help me prepare for GMAT", "I want to get fit in 3 months", "plan a trip to Japan"
NOT magic_capture: These are goals/aspirations, not concrete tasks. They need to be broken into a structured plan.

LIBRARIAN: User is asking a question about their existing tasks or goals.
Signs: Question words (when, what, where, which, how many), searching for specific info
Examples: "when is my dentist?", "what's due this week?", "do I have any work tasks?", "what did I complete yesterday?"

REALITY_CHECK: User wants to analyze their workload or daily capacity.
Signs: Mentions overload, capacity, too much, can I handle, reality check
Examples: "am I overloaded?", "reality check", "can I take on more?", "is today too heavy?"

SMART_REVIEW: User wants a summary of their progress or accomplishments.
Signs: Review, summary, how did I do, progress, accomplishments
Examples: "how did I do this week?", "weekly review", "show my progress", "summarize my week"

STUCK_BREAKER: User wants help breaking down a large or stuck task into subtasks.
Signs: "break down", "stuck on", "too big", "subtasks", "smaller steps", "split", "help with [task]", "how do I start", "steps for", "unblock"
Examples: "help me break down this task", "I'm stuck on my project", "can you split this into subtasks?", "break down Clean garbage", "I'm stuck on Clean garbage", "help with the laundry task", "how do I start on my report?"

GOAL_AUDIT: User wants to check on neglected or stale goals.
Signs: "neglected goals", "forgotten goals", "goal check", "stale goals", "abandoned"
Examples: "any neglected goals?", "check on my goals", "which goals need attention?"

SUNDAY_GARDENER: User wants help cleaning up, organizing, or maintaining their task list.
Signs: "clean up", "organize", "gardening", "tidy", "maintenance", "overdue tasks"
Examples: "help me clean up my tasks", "task maintenance", "sunday gardening", "organize my list"

GENERAL_CHAT: Greetings, thanks, questions about the app, or unclear intent.
Signs: Greetings, thanks, questions about the app, unclear intent, single words without action context
Examples: "hello", "thanks!", "what can you do?", "hi there", "help"

User message: {message}

Respond with valid JSON only:
{{"intent": "magic_capture" | "deep_plan" | "librarian" | "reality_check" | "smart_review" | "stuck_breaker" | "goal_audit" | "sunday_gardener" | "general_chat", "confidence": 0.0 to 1.0, "reasoning": "brief explanation"}}"""


def classify_intent(message: str) -> IntentClassification:
    llm = get_llm(temperature=0.1)
    parser = JsonOutputParser()

    prompt = ChatPromptTemplate.from_template(INTENT_CLASSIFICATION_PROMPT)
    chain = prompt | llm | parser

    result = chain.invoke({"message": message})

    intent_str = result.get("intent", "general_chat").lower().strip()
    try:
        intent = Intent(intent_str)
    except ValueError:
        print(f"DEBUG: Intent classification failed for '{intent_str}'. Defaulting to general_chat.")
        intent = Intent.GENERAL_CHAT

    confidence = float(result.get("confidence", 0.5))
    reasoning = result.get("reasoning", "")

    if confidence < 0.6:
        intent = Intent.GENERAL_CHAT
        reasoning = f"Low confidence ({confidence:.2f}), defaulting to chat. Original: {reasoning}"

    return IntentClassification(
        intent=intent,
        confidence=confidence,
        reasoning=reasoning
    )
