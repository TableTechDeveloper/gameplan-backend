const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { databaseURL } = require("./config/config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if the database URL is provided
if (databaseURL) {
    // Connect to MongoDB using the provided database URL
    mongoose.connect(databaseURL, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log("Database connected successfully"))
        .catch(err => console.error("Database connection error:", err));
} else {
    console.error("No valid database URL provided");
}

// Import the user route module
const userRoute = require("./controllers/UserRouter");
app.use("/user", userRoute);

// Import the event route module
const eventRoute = require("./controllers/EventRouter");
app.use("/events", eventRoute);

module.exports = app;