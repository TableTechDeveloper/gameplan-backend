// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { databaseURL } = require('./config/config');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (databaseURL) {
    mongoose.connect(databaseURL, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Database connected successfully'))
        .catch(err => console.error('Database connection error:', err));
} else {
    console.error('No valid database URL provided');
}

const userRoute = require('./controllers/UserRouter')
app.use('/user', userRoute)

app.get("*", (request, response, next) => {
    response.status(404).json({
        message: "404, Page not found!"
    })
})

app.use((error, request, response, next) => {
    response.status(error.status || 500).json({
        message: error.message || "An error has occurred",
        errors: error.errors || []
    });
});

module.exports = app;