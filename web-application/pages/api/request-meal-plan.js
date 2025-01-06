const { MongoClient, ObjectId } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function getCurrentWeekOfYear(date = new Date()) {
    // Set the first day of the week to Monday
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor(
        (date - firstDayOfYear + (firstDayOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000) / 86400000 + 1
    );

    // Calculate week number
    const weekNumber = Math.ceil((dayOfYear + firstDayOfYear.getDay()) / 7);

    return weekNumber;
}

function getFirstDayOfWeekMonday(date = new Date()) {
    const firstDay = new Date(date);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Adjust for Sunday being 0
    firstDay.setDate(date.getDate() + diff);
    firstDay.setHours(0, 0, 0, 0); // Set time to the start of the day

    return firstDay.toISOString().split('T')[0];
}

async function requestMealPlan() {
  try {
    await client.connect();
    
    const database = client.db("meal_planner");
    const collection = database.collection("weekly_meal_plans");

    const data = {
        week: getCurrentWeekOfYear(),
        startDate: getFirstDayOfWeekMonday(),
        status: "Processing"
    }

    // Insert data into the collection
    const result = await collection.insertOne(data);

    console.log(`Data saved with id: ${result.insertedId}`);

    data._id = result.insertedId;

    console.log(data);

    return data;
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

export default async function handler(req, res) {
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    let data = await requestMealPlan();

    // Return a JSON response with ok: true
    res.status(200).json({ data });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}