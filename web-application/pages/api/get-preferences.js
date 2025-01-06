const { MongoClient } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function getSettings() {
  const client = new MongoClient(uri);
  let settings = [];

  try {
    await client.connect();
    
    const database = client.db("meal_planner");
    const collection = database.collection("meal_preferences");

    settings = await collection
      .findOne({}, { projection: { _id: 1, likes: 1, dislikes: 1, hardRequirements: 1, mealCount: 1 } });

    console.log(settings);
  } catch (error) {
    console.error("Error getting data:", error);
  } finally {
    await client.close();
  }

  return settings;
}

export default async function handler(req, res) {
  let settings = await getSettings();

  console.dir(settings);

  res.status(200).json({ settings });
}