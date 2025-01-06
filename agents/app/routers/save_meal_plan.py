from fastapi import APIRouter, Response, Request
import asyncio
import json
import re
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

@router.api_route("/save-meal-plan", methods=["GET", "POST"])
async def save_meal_plan(request: Request):
    print("save_meal_plan")
    if request.method == "POST":
        data = await request.json()

        print(data)

        # Connect to the MongoDB instance
        client = MongoClient(os.getenv("MONGODB_URI"))  # Replace with your MongoDB URI

        # Access the database and collection
        db = client['meal_planner']  # Database name
        collection = db['weekly_meal_plans']  # Collection name

        for item in data:
            request_id = item.get('request_id')
            meal_plan = item.get('meal_plan')

            # Update the record
            result = collection.update_one(
                {"_id": ObjectId(request_id)},  # Match document by _id
                {"$set": {"status": "Available", "meal_plan": meal_plan}}  # Update fields
            )

            # Check if the update was successful
            if result.matched_count > 0:
                print(f"Successfully updated the record with _id: {request_id}")
            else:
                print(f"No record found with _id: {request_id}")            
            
        return Response(content="Saving Meal Plan to Database", media_type="text/plain", status_code=200)