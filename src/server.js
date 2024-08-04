const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { databaseURL } = require("./config/config");
const { errorHandler, sendErrorResponse } = require("./utils/_utils");

const app = express();

app.use(
    cors({
      origin: "http://localhost:3001",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Explicitly allow options method
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to the database
if (databaseURL) {
    mongoose.connect(databaseURL)
        .then(() => console.log("Database connected successfully"))
        .catch(err => console.error("Database connection error:", err));
} else {
    console.error("No valid database URL provided");
}

// Import and use user routes
const userRoute = require("./controllers/UserRouter");
app.use("/user", userRoute);

// Import and use event routes
const eventRoute = require("./controllers/EventRouter");
app.use("/events", eventRoute);

// Import and use game routes
const gameRoute = require("./controllers/GameRouter");
app.use("/games", gameRoute);

// Catch-all route for handling 404 errors
app.use((request, response, next) => {
    sendErrorResponse(response, 404, "Not Found", ["The requested resource could not be found"]);
});

// General error handler middleware
app.use(errorHandler);

module.exports = app;