from fastapi import APIRouter, Response, Request
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import json
import asyncio
from ..utils.common_utils import get_kid_preferences, get_hard_requirements, get_recent_meals, get_current_date
from ..utils.publish_to_topic import produce
from ..utils.constants import CHILD_PREFERENCES_OUTPUT_TOPIC

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

model = ChatAnthropic(model='claude-3-5-haiku-20241022', temperature=0.7)

tools = [get_kid_preferences, get_hard_requirements, get_recent_meals]

SYSTEM_PROMPT = """You are an expert at designing nutritious meals that toddlers love.
    You will be prompted to generate a weekly dinner plan.
    You'll have access to meal preferences. Use these as inpiration to come up with meals but you don't have to explicitly use these items.
    You'll have access to recent meals. Factor these in so you aren't repetitive.
    You must take into account any hard requirements about meals.
    Bias towards meals that can be made in less than 30 minutes. Keep meal preparation simple.
    There is no human in the loop, so don't prompt for additional input.
    """

graph = create_react_agent(model, tools=tools, state_modifier=SYSTEM_PROMPT)

async def start_agent_flow(request_id):
    inputs = {"messages": [("user", "Plan 4 dinners for my children.")]}
    response = await graph.ainvoke(inputs)

    last_message_content = response["messages"][-1]
    content = last_message_content.pretty_repr()

    print(content)
    produce(CHILD_PREFERENCES_OUTPUT_TOPIC, { "content": content, "request_id": request_id })

@router.api_route("/child-preferences-agent", methods=["GET", "POST"])
async def get_child_meal_plan(request: Request):
    print("get_child_meal_plan")
    if request.method == "POST":
        data = await request.json()

        print(data)

        for item in data:
            oid_raw = item.get('fullDocument', {}).get('_id', '{}')
            request_id = json.loads(oid_raw).get('$oid') if oid_raw else None

            print(request_id)

            if request_id is not None:
                asyncio.create_task(start_agent_flow(request_id))

        return Response(content="Child Meal Planning Agent Started", media_type="text/plain", status_code=200)
