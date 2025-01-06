const { MongoClient, ObjectId } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function deleteMealPlan(requestId) {
  try {
    await client.connect();

    console.log('deleting ' + requestId);
    
    const database = client.db("meal_planner");
    const collection = database.collection("weekly_meal_plans");

    const result = await collection.deleteOne({ _id: new ObjectId(requestId) });

    if (result.deletedCount === 0) {
      throw new Error(`Meal plan with ID ${requestId} not found.`);
    }

    console.log(`Meal plan with ID ${requestId} deleted successfully.`);
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

export default async function handler(req, res) {
  console.log('here');
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'DELETE') {
    try {
        // Extract the ID from the request URL
        const { id } = req.query;

        console.log(id);
  
        // Assign the ID to requestId
        const requestId = id;
  
        // Log or handle the ID as needed
        console.log(`Deleting meal plan with ID: ${requestId}`);
  
        // Example: Perform a delete operation on your database here
        await deleteMealPlan(requestId);
  
        // Send a success response
        res.status(200).json({ ok: true });
      } catch (error) {
        console.error('Error deleting meal plan:', error);
        res.status(500).json({ error: 'Failed to delete meal plan' });
      }
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}