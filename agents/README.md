# Meal Planner Multi-Agent and HTTP Sink APIs

This folder contains a Python app that supports given API endpoints. 

* `/api/child-preferences-agent`: A ReAct agent that creates a meal plan for children.
* `/api/adult-preferences-agent`: A ReAct agent that creates a meal plan for the adults.
* `/api/shared-preferences-agent`: A reflection agent that combines the child and adult meal plans into a single meal plan.
* `/api/format-output-agent`: A ReAct agent that formats the meal plan into a structured JSON payload.
* `/api/save-meal-plan`: An endpoint to take the structured JSON data and save it into MongoDB.

Refer to the main README.md for detailed instructions in how to setup and configure this application.

## Configuring the application

You need to create a `.env` file with the following values:
* ANTHROPIC_API_KEY
* LANGCHAIN_TRACING_V2
* LANGCHAIN_API_KEY
* MONGODB_URI

As well as a `client.properties` file that contains properties to connect to Confluent.

## Running the application

From the your terminal, navigate to the `/agents` directory and enter the following command:

```shell
python -m venv env
source env/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```