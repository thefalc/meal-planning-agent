from fastapi import APIRouter, Response, Request
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv
import asyncio
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from typing import Annotated, List, Sequence
from langgraph.graph import END, StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict
from ..utils.publish_to_topic import produce
from ..utils.constants import COMPLETE_MEAL_PLAN_OUTPUT_TOPIC

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

model = ChatAnthropic(model='claude-3-5-haiku-20241022', temperature=0.7)

MAX_ITERATIONS = 3

generate_content_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a meal planning assistant for families."
            "Your job is to combine the recommended meal plan for the children and the adults into a singular meal plan that works for the family."
            "Aim to minimize creating multiple dishes. Each meal should be able to work for both the adults and kids."
            "Make sure you include the same number of meals in the combined plan as in the original plans."
            "Output should contain the name of the meal, any modification or version for the children, any modification or version for the adults, core ingredients, prep time, and basic recipe."
            "If the user provides critique, respond with a revised version of your previous attempts.",
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

reflection_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a family meal planning expert grading the quality of the recommended meals on taste, variety, and nutritional value."
            "Generate critique and recommendations for the user's submission."
            "Provide detailed recommendations, including requests for greater variety, tastier meals, or higher nutrional value.",
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

generate_chain = generate_content_prompt | model
reflection_chain = reflection_prompt | model

class State(TypedDict):
    messages: Annotated[list, add_messages]


async def generation_node(state: State) -> State:
    return {"messages": [await generate_chain.ainvoke(state["messages"])]}


async def reflection_node(state: State) -> State:
    # Other messages we need to adjust
    cls_map = {"ai": HumanMessage, "human": AIMessage}
    # First message is the original user request. We hold it the same for all nodes
    translated = [state["messages"][0]] + [
        cls_map[msg.type](content=msg.content) for msg in state["messages"][1:]
    ]
    res = await reflection_chain.ainvoke(translated)
    # We treat the output of this as human feedback for the generator
    return {"messages": [HumanMessage(content=res.content)]}


builder = StateGraph(State)
builder.add_node("generate", generation_node)
builder.add_node("reflect", reflection_node)
builder.add_edge(START, "generate")

def should_continue(state: State):
    if len(state["messages"]) > MAX_ITERATIONS:
        return END
    return "reflect"

builder.add_conditional_edges("generate", should_continue)
builder.add_edge("reflect", "generate")
memory = MemorySaver()
graph = builder.compile(checkpointer=memory)

async def start_agent_flow(request_id, child_meal_plan, adult_meal_plan):
    config = {"configurable": {"thread_id": "1"}}

    response = await graph.ainvoke({
            "messages": [
                HumanMessage(
                    content=f"""Generate a single meal plan based on the proposed meal plan for the kids and adults.
                            Kids meals: {child_meal_plan}
                            Adult meals: {adult_meal_plan}
                            """
                )
            ],
        },
        config)
    
    last_message_content = response["messages"][-1]
    content = last_message_content.pretty_repr()

    print(content)
    produce(COMPLETE_MEAL_PLAN_OUTPUT_TOPIC, { "meal_plan": content, "request_id": request_id })

@router.api_route("/shared-preferences-agent", methods=["GET", "POST"])
async def get_shared_meal_plan(request: Request):
    print("get_shared_meal_plan")
    if request.method == "POST":
        data = await request.json()

        print(data)

        for item in data:
            request_id = item.get('request_id')
            child_preference = item.get('child_preference')
            adult_preference = item.get('adult_preference')            

            asyncio.create_task(start_agent_flow(request_id, child_preference, adult_preference))

        return Response(content="Adult Meal Planning Agent Started", media_type="text/plain", status_code=200)



