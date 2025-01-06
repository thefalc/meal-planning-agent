from langchain_core.tools import tool
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def get_current_date():
    # Get the current date
    current_date = datetime.now().date()

    # Format the date as YYYY-MM-DD
    return current_date.strftime("%Y-%m-%d")

def print_stream(stream):
    for s in stream:
        message = s["messages"][-1]
        if isinstance(message, tuple):
            print(message)
        else:
            message.pretty_print()

@tool
def get_kid_preferences():
    """Use this to get the likes and dislikes for the kids preferences."""
    # Connect to the MongoDB instance
    client = MongoClient(os.getenv("MONGODB_URI"))  # Replace with your MongoDB URI

    # Access the database and collection
    db = client['meal_planner']  # Database name
    collection = db['meal_preferences']  # Collection name

    projection = {"likes": 1, "dislikes": 1, "_id": 0} 
    result = collection.find_one({}, projection)

    return result


@tool
def get_hard_requirements():
    """Use this to get the hard requirements for recommending a meal. These must be enforced."""
    # Connect to the MongoDB instance
    client = MongoClient(os.getenv("MONGODB_URI"))  # Replace with your MongoDB URI

    # Access the database and collection
    db = client['meal_planner']  # Database name
    collection = db['meal_preferences']  # Collection name

    projection = {"hardRequirements": 1, "_id": 0} 
    result = collection.find_one({}, projection)

    return result


@tool
def get_recent_meals():
    """Use this to get recent meals."""
    # Connect to the MongoDB instance
    client = MongoClient(os.getenv("MONGODB_URI"))  # Replace with your MongoDB URI\
    
    # Access the database and collection
    db = client['meal_planner']
    collection = db['weekly_meal_plans']

    # Query to get the last two entries
    recent_meals = list(collection.find().sort([("$natural", -1)]).limit(2))

    return recent_meals


@tool
def get_first_day_of_week():
    """Use this to get the first day of the current week."""
    # Get the current date
    current_date = datetime.now()

    # Calculate the start of the week (Monday)
    start_of_week = current_date - timedelta(days=current_date.weekday())

    return start_of_week.strftime('%Y-%m-%d')


def get_meal_count():
    """Use this to get how many meals to plan for."""
    # Connect to the MongoDB instance
    client = MongoClient(os.getenv("MONGODB_URI"))  # Replace with your MongoDB URI\
    
    # Access the database and collection
    db = client['meal_planner']
    collection = db['meal_preferences']

    projection = {"mealCount": 1, "_id": 0} 
    result = collection.find_one({}, projection)

    return result.get("mealCount")