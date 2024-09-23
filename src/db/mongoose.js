const mongoose = require("mongoose");
const endpoints = require("../constants/endpoints");

mongoose.set("strictQuery", false);

async function connectToDatabase() {
  try {
    await mongoose.connect(endpoints?.mongo_db_url, {
      useNewUrlParser: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB: ", err);
  }
}

connectToDatabase();
