from typing import Any
from langgraph.graph import StateGraph, START, END

from app.ai.graphs.state import DeepPlanState
from app.ai.graphs.nodes import gather_info, generate_plan, refine_plan, prepare_final


APPROVAL_SIGNALS = ["create it", "looks good", "perfect", "do it", "yes", "approve", "confirm", "let's do it"]
CANCEL_SIGNALS = ["cancel", "start over", "nevermind", "forget it", "stop", "reset"]

MAX_ITERATIONS = 10


def route_to_node(state: DeepPlanState) -> str:
    """
    Entry router - determine which node to start with based on state.
    Called on every graph invocation (including resumptions).
    """
    phase = state.get("phase", "gathering")
    iteration_count = state.get("iteration_count", 0)
    messages = state.get("messages", [])

    # Safety limit
    if iteration_count > MAX_ITERATIONS:
        return "prepare_final"

    # Check latest message for special signals
    if messages:
        latest = messages[-1].get("content", "").lower() if messages[-1].get("role") == "user" else ""

        if any(signal in latest for signal in APPROVAL_SIGNALS):
            return "prepare_final"

        if any(signal in latest for signal in CANCEL_SIGNALS):
            return "handle_cancel"

    # Route based on phase
    if phase == "refining":
        return "refine_plan"

    # Default - gathering or generating phase
    return "gather_info"


def after_gather_info(state: DeepPlanState) -> str:
    """
    After gather_info: continue to generate_plan if ready, else wait.
    """
    phase = state.get("phase", "gathering")

    if phase == "generating":
        return "generate_plan"

    # Still gathering - wait for user input
    return END


def handle_cancel(state: DeepPlanState) -> dict[str, Any]:
    """Reset state when user cancels the planning session."""
    return {
        "phase": "gathering",
        "plan_data": None,
        "user_constraints": {},
        "goal_intent": "",
        "needs_info": [],
        "iteration_count": 0,
        "final_message": "No problem! Let me know when you'd like to plan something else.",
        "messages": [{"role": "assistant", "content": "No problem! Let me know when you'd like to plan something else."}],
    }


def build_deep_plan_graph() -> StateGraph:
    """
    Construct the Deep Plan Architect graph.

    Flow:
    START → route_to_node → [gather_info | refine_plan | prepare_final | handle_cancel]
    gather_info → after_gather_info → [generate_plan | END]
    generate_plan → END
    refine_plan → END
    prepare_final → END
    handle_cancel → END
    """
    graph = StateGraph(DeepPlanState)

    # Add nodes
    graph.add_node("gather_info", gather_info)
    graph.add_node("generate_plan", generate_plan)
    graph.add_node("refine_plan", refine_plan)
    graph.add_node("prepare_final", prepare_final)
    graph.add_node("handle_cancel", handle_cancel)

    # Entry routing from START
    graph.add_conditional_edges(
        START,
        route_to_node,
        {
            "gather_info": "gather_info",
            "refine_plan": "refine_plan",
            "prepare_final": "prepare_final",
            "handle_cancel": "handle_cancel",
        }
    )

    # After gather_info: continue to generate_plan or wait
    graph.add_conditional_edges(
        "gather_info",
        after_gather_info,
        {
            "generate_plan": "generate_plan",
            END: END,
        }
    )

    # All other nodes go to END
    graph.add_edge("generate_plan", END)
    graph.add_edge("refine_plan", END)
    graph.add_edge("prepare_final", END)
    graph.add_edge("handle_cancel", END)

    return graph


def get_compiled_graph(checkpointer=None):
    """Get compiled graph, optionally with checkpointer for state persistence."""
    graph = build_deep_plan_graph()
    return graph.compile(checkpointer=checkpointer)


# Singleton for graph without checkpointer (for testing)
_graph_no_checkpoint = None


def get_deep_plan_graph():
    """Get compiled graph without checkpointing (for simple testing)."""
    global _graph_no_checkpoint
    if _graph_no_checkpoint is None:
        _graph_no_checkpoint = get_compiled_graph()
    return _graph_no_checkpoint
