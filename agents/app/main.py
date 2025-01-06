from fastapi import FastAPI
from app.routers import child_preferences_agent, adult_preferences_agent, shared_preferences_agent, format_output_agent, save_meal_plan

app = FastAPI()

# Include the routers
app.include_router(child_preferences_agent.router, prefix="/api", tags=["Child Preferences"])
app.include_router(adult_preferences_agent.router, prefix="/api", tags=["Adult Preferences"])
app.include_router(shared_preferences_agent.router, prefix="/api", tags=["Shared Meal Plan"])
app.include_router(format_output_agent.router, prefix="/api", tags=["Format Meal Plan"])
app.include_router(save_meal_plan.router, prefix="/api", tags=["Save Meal Plan"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the API!"}