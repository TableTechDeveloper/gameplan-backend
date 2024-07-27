const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { databaseURL } = require("./config/config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (databaseURL) {
    mongoose.connect(databaseURL)
        .then(() => console.log("Database connected successfully"))
        .catch(err => console.error("Database connection error:", err));
} else {
    console.error("No valid database URL provided");
}

const userRoute = require("./controllers/UserRouter")
app.use("/user", userRoute)

const eventRoute = require("./controllers/EventRouter")
app.use("/events", eventRoute)

module.exports = app;