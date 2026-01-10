from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.ai.config import get_llm
from app.schemas.ai import Intent, IntentClassification


INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a task management app.
Classify the user's message into one of these intents:

MAGIC_CAPTURE: User wants to create one or more tasks from natural language.
Signs: Contains action items, comma-separated tasks, "add", "create", "remind me", "todo"
Examples: "buy milk, fix bike", "add call mom to my list", "remind me to pay rent", "todo: finish report"

LIBRARIAN: User is asking a question about their existing tasks or goals.
Signs: Question words (when, what, where, which, how many), searching for specific info
Examples: "when is my dentist?", "what's due this week?", "do I have any work tasks?", "what did I complete yesterday?"

REALITY_CHECK: User wants to analyze their workload or daily capacity.
Signs: Mentions overload, capacity, too much, can I handle, reality check
Examples: "am I overloaded?", "reality check", "can I take on more?", "is today too heavy?"

SMART_REVIEW: User wants a summary of their progress or accomplishments.
Signs: Review, summary, how did I do, progress, accomplishments
Examples: "how did I do this week?", "weekly review", "show my progress", "summarize my week"

GENERAL_CHAT: Greetings, thanks, questions about the app, or unclear intent.
Signs: Greetings, thanks, questions about the app, unclear intent, single words without action context
Examples: "hello", "thanks!", "what can you do?", "hi there", "help"

User message: {message}

Respond with valid JSON only:
{{"intent": "magic_capture" | "librarian" | "reality_check" | "smart_review" | "general_chat", "confidence": 0.0 to 1.0, "reasoning": "brief explanation"}}"""


def classify_intent(message: str) -> IntentClassification:
    llm = get_llm(temperature=0.1)
    parser = JsonOutputParser()

    prompt = ChatPromptTemplate.from_template(INTENT_CLASSIFICATION_PROMPT)
    chain = prompt | llm | parser

    result = chain.invoke({"message": message})

    intent_str = result.get("intent", "general_chat")
    try:
        intent = Intent(intent_str)
    except ValueError:
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
