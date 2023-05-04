const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_PROD_URL, {
      useNewUrlParser: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB: ", err);
  }
}

connectToDatabase();
