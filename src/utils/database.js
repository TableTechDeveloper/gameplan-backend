const mongoose = require("mongoose");

// Function to connect to the MongoDB database
async function databaseConnector(databaseURL) {
    await mongoose.connect(databaseURL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Database connection completed");
}

// Function to disconnect from the MongoDB database
async function databaseDisconnector() {
    await mongoose.connection.close();
    console.log("Database disconnected");
}

// Function to clear the MongoDB database
async function databaseClear() {
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped");
}

module.exports = {
    databaseConnector,
    databaseDisconnector,
    databaseClear
};