const { MongoClient, ObjectId } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function saveSettings(settingsId, settings) {
  try {
    await client.connect();
    
    const database = client.db("meal_planner");
    const collection = database.collection("meal_preferences");

    const filter = { _id: new ObjectId(settingsId) };
        const update = {
            $set: {
                likes: settings.likes,
                dislikes: settings.dislikes,
                hardRequirements: settings.hardRequirements,
                mealCount: settings.mealCount
            },
        };

    const options = { upsert: true };
    const result = await collection.updateOne(filter, update, options);
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

export default async function handler(req, res) {
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    const { _id, likes, dislikes, hardRequirements, mealCount } = req.body;

    const settings = {
        likes,
        dislikes,
        hardRequirements,
        mealCount
      };

    console.log(settings);
    
    saveSettings(_id, settings);

    // Return a JSON response with ok: true
    res.status(200).json({ ok: true });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}