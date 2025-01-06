from fastapi import APIRouter, Response, Request
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent
import asyncio
import json
import re
from dotenv import load_dotenv
from ..utils.common_utils import get_first_day_of_week
from ..utils.publish_to_topic import produce
from ..utils.constants import FORMATTED_MEAL_PLAN_OUTPUT_TOPIC

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

model = ChatAnthropic(model='claude-3-5-haiku-20241022', temperature=0.7)

tools = [get_first_day_of_week]

SYSTEM_PROMPT = """You are a system that processes meal plans and reformats them into a structured JSON format.
    The input you receive contains an unstructured meal plan for a specific week in the year.
    Your task is to extract key details and output a JSON payload with the following structure:
    {
        "summary": <string>,
        "meals": [
            {
                "title": <string>,
                "coreIngredients": [<string>],
                "kidsVersion": <string>,
                "adultVersion": <string>,
                "recipe": <string>
            },
            ...
        ]
    }
    Instructions:

    1. For the summary, create a short summary for the meals of the week including the meal names.
    2. For each meal in the input:
        - Extract the meal title and assign it to title.
        - Identify the core ingredients and list them in coreIngredients.
        - Extract the description for the kids' version and assign it to kidsVersion.
        - Extract the description for the adult version and assign it to adultVersion.
        - Extract the basic recipe and assign it to recipe.
    3. Ensure all extracted data is clean, properly formatted, and follows the given JSON structure.
    
    Example Input:

    1. Cheesy Broccoli Chicken Pasta Bake
    - Name: Family Pasta Bake
    - Kids Version: Regular cheesy pasta with extra cheese
    - Adult Version: Herb-seasoned with added protein (ground chicken)
    - Core Ingredients: Pasta, broccoli, cheese, chicken, herbs
    - Prep Time: 35 minutes
    - Modifications: 
        * For kids: Smaller pieces, milder seasoning
        * For adults: More herbs, potential addition of red pepper flakes
    - Recipe: Instructions:
        Preheat Oven:

        Preheat your oven to 375°F (190°C).
        Cook Pasta and Broccoli:

        Bring a large pot of salted water to a boil. Cook the pasta according to package instructions, adding the broccoli to the pot for the last 3 minutes of cooking.
        Drain and set aside.
        Prepare the Chicken:

        Heat a large skillet over medium heat. Add a drizzle of olive oil and cook the ground chicken until browned and cooked through, breaking it into small pieces as it cooks.
        Season with salt, pepper, and the mixed dried herbs.
        Assemble the Pasta Bake:

        In a large mixing bowl, combine the cooked pasta, broccoli, chicken, and 1 1/2 cups of shredded cheese. Mix until evenly combined.
        If making the adult version, add Parmesan and red pepper flakes at this stage.
        Divide for Kids and Adults (Optional):

        If making separate versions, split the mixture into two baking dishes.
        For the kids' version, sprinkle extra shredded cheese on top.
        For the adults' version, sprinkle a mix of Parmesan and shredded cheese on top.
        Bake:

        Place the baking dish(es) in the preheated oven. Bake for 20–25 minutes, or until the top is golden and bubbly.
        Serve:

        Let the pasta bake cool for a few minutes before serving. Garnish the adult version with fresh herbs if desired.

    2. Teriyaki Protein Plate
    - Name: Family Teriyaki Plate
    - Kids Version: Mild teriyaki chicken, udon noodles
    - Adult Version: Spicy teriyaki option, added vegetables
    - Core Ingredients: Chicken, udon noodles, teriyaki sauce, vegetables
    - Prep Time: 25 minutes
    - Modifications:
        * For kids: Less spicy, cut into smaller pieces
        * For adults: Add chili oil, extra vegetables
    - Recipe: Instructions:
            Prep Ingredients:

            Wash and chop the vegetables into bite-sized pieces.
            Cut the chicken into small chunks.
            Cook the Udon Noodles:

            Bring a pot of water to a boil. Cook the udon noodles according to package instructions.
            Drain, rinse with cool water, and set aside.
            Prepare the Chicken:

            Heat 1 tbsp of vegetable oil in a large skillet over medium heat. Add the chicken pieces and cook until golden brown and fully cooked, about 6–8 minutes.
            Remove half of the chicken for the kids' version.
            Make Kids' Teriyaki Chicken:

            In a small pan, combine the mild teriyaki sauce with the reserved chicken and warm over low heat. Remove from heat once coated.
            Make Adults' Spicy Teriyaki Chicken:

            In the original skillet, push the remaining chicken to one side and add an additional 1 tbsp of oil.
            Add the extra vegetables and stir-fry for 2–3 minutes until slightly tender.
            Drizzle chili oil over the chicken and vegetables, then pour in the teriyaki sauce. Stir until everything is evenly coated.
            Assemble the Plates:

            For the kids' version, place udon noodles on a plate, top with mild teriyaki chicken, and garnish with a few plain veggies if desired.
            For the adults' version, layer udon noodles, spicy teriyaki chicken, and sautéed vegetables. Garnish with additional chili oil for extra heat.
            Serve:

            Divide the plates for kids and adults, ensuring everyone gets the flavor and spice level they prefer.
    
    Example Output:
    {
        "summary": "Family pasta bake and teriyaki protein plate",
        "meals": [
            {
                "title": "Family Pasta Bake",
                "coreIngredients": ["pasta", "broccoli", "cheese", "chicken", "herbs"],
                "kidsVersion": "Regular cheesy pasta with extra cheese",
                "adultVersion": "Herb-seasoned with added protein (ground chicken)"
                "recipe": "Instructions:
                    Preheat Oven:

                    Preheat your oven to 375°F (190°C).
                    Cook Pasta and Broccoli:

                    Bring a large pot of salted water to a boil. Cook the pasta according to package instructions, adding the broccoli to the pot for the last 3 minutes of cooking.
                    Drain and set aside.
                    Prepare the Chicken:

                    Heat a large skillet over medium heat. Add a drizzle of olive oil and cook the ground chicken until browned and cooked through, breaking it into small pieces as it cooks.
                    Season with salt, pepper, and the mixed dried herbs.
                    Assemble the Pasta Bake:

                    In a large mixing bowl, combine the cooked pasta, broccoli, chicken, and 1 1/2 cups of shredded cheese. Mix until evenly combined.
                    If making the adult version, add Parmesan and red pepper flakes at this stage.
                    Divide for Kids and Adults (Optional):

                    If making separate versions, split the mixture into two baking dishes.
                    For the kids' version, sprinkle extra shredded cheese on top.
                    For the adults' version, sprinkle a mix of Parmesan and shredded cheese on top.
                    Bake:

                    Place the baking dish(es) in the preheated oven. Bake for 20–25 minutes, or until the top is golden and bubbly.
                    Serve:

                    Let the pasta bake cool for a few minutes before serving. Garnish the adult version with fresh herbs if desired."
            },
            {
                "title": "Family Teriyaki Plate",
                "coreIngredients": ["chicken", "udon noodles", "teriyaki sauce", "vegetables"],
                "kidsVersion": "Mild teriyaki chicken, udon noodles",
                "adultVersion": "Spicy teriyaki option, added vegetables"
                "recipe": "Instructions:
                    Prep Ingredients:

                    Wash and chop the vegetables into bite-sized pieces.
                    Cut the chicken into small chunks.
                    Cook the Udon Noodles:

                    Bring a pot of water to a boil. Cook the udon noodles according to package instructions.
                    Drain, rinse with cool water, and set aside.
                    Prepare the Chicken:

                    Heat 1 tbsp of vegetable oil in a large skillet over medium heat. Add the chicken pieces and cook until golden brown and fully cooked, about 6–8 minutes.
                    Remove half of the chicken for the kids' version.
                    Make Kids' Teriyaki Chicken:

                    In a small pan, combine the mild teriyaki sauce with the reserved chicken and warm over low heat. Remove from heat once coated.
                    Make Adults' Spicy Teriyaki Chicken:

                    In the original skillet, push the remaining chicken to one side and add an additional 1 tbsp of oil.
                    Add the extra vegetables and stir-fry for 2–3 minutes until slightly tender.
                    Drizzle chili oil over the chicken and vegetables, then pour in the teriyaki sauce. Stir until everything is evenly coated.
                    Assemble the Plates:

                    For the kids' version, place udon noodles on a plate, top with mild teriyaki chicken, and garnish with a few plain veggies if desired.
                    For the adults' version, layer udon noodles, spicy teriyaki chicken, and sautéed vegetables. Garnish with additional chili oil for extra heat.
                    Serve:

                    Divide the plates for kids and adults, ensuring everyone gets the flavor and spice level they prefer."
            }
        ]
    }

    Follow this pattern strictly. If any part of the input is ambiguous or missing,
    make a best guess based on context and include placeholder values like null where appropriate.
    Respond with the JSON only. Absolutely nothing else.
    """

graph = create_react_agent(model, tools=tools, state_modifier=SYSTEM_PROMPT)

def extract_json_from_string(input_string):
    try:
        # Find the first '{' and last '}'
        start = input_string.find('{')
        end = input_string.rfind('}')
        
        if start != -1 and end != -1 and start < end:
            # Extract the substring and validate it as JSON
            potential_json = input_string[start:end+1]
            json_object = json.loads(potential_json)  # Validate JSON
            return json_object
    except json.JSONDecodeError:
        pass  # Handle invalid JSON gracefully
    
    return None  # Return None if no valid JSON is found

async def start_agent_flow(request_id, meal_plan):
    user_input = f"""Format the meal plan.
                    Meal plan: {meal_plan}
                """

    inputs = {"messages": [("user", user_input)]}
    response = await graph.ainvoke(inputs, stream_mode="values")

    last_message_content = response["messages"][-1]
    content = last_message_content.pretty_repr()

    print(content)

    # clean up output just in case there's non JSON syntax
    content = extract_json_from_string(content)

    print(content)
    produce(FORMATTED_MEAL_PLAN_OUTPUT_TOPIC, { "meal_plan": content, "request_id": request_id })

@router.api_route("/format-output-agent", methods=["GET", "POST"])
async def format_output_agent(request: Request):
    print("format_output_agent")
    if request.method == "POST":
        data = await request.json()

        print(data)

        for item in data:
            request_id = item.get('request_id')
            meal_plan = item.get('meal_plan')

            asyncio.create_task(start_agent_flow(request_id, meal_plan))

            return Response(content="Formatting Output Agent Started", media_type="text/plain", status_code=200)