const { MongoClient } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function getAllMealPlans() {
  const client = new MongoClient(uri);
  let meal_plans = [];

  try {
    await client.connect();
    
    const database = client.db("meal_planner");
    const collection = database.collection("weekly_meal_plans");

    meal_plans = await collection
      .find({}, { projection: { _id: 1, week: 1, startDate: 1, status: 1, meals: 1, meal_plan: 1 } })
      .sort({ _id: -1 })
      .toArray();

    console.log(meal_plans);
  } catch (error) {
    console.error("Error getting data:", error);
  } finally {
    await client.close();
  }

  return meal_plans;
}

export default async function handler(req, res) {
  let meal_plans = await getAllMealPlans();

  console.dir(meal_plans);

  res.status(200).json({ ok: true, meal_plans: meal_plans });
}