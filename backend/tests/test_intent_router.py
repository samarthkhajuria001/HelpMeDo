from app.ai.chains.intent_router import classify_intent

messages = [
    "I want to learn Japanese in 2 months",
    "I want to learn Japanese",
    "Plan a trip to Paris",
    "Buy milk"
]

print("--- Testing Intent Classification ---")
for msg in messages:
    result = classify_intent(msg)
    print(f"\nMessage: '{msg}'")
    print(f"Intent: {result.intent.value}")
    print(f"Confidence: {result.confidence}")
    print(f"Reasoning: {result.reasoning}")

