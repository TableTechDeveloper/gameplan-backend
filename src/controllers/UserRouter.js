// src/controllers/UserRouter.js
const express = require("express");
const router = express.Router();
const { User } = require("../models/models");
const { createJWT, checkPassword, authenticateJWT } = require("../utils/authHelpers");
const { handleValidationError } = require("../utils/validation");

router.post("/register", async (request, response, next) => {
    const { email, password, username, location } = request.body;

    const newUser = new User({
        email,
        password,
        username,
        location
    });

    try {
        await newUser.save();
        const token = createJWT(newUser._id);
        response.status(201).json({ token, user: newUser });
    } catch (error) {
        handleValidationError(error, response);
    }
});

router.post("/login", async (request, response, next) => {
    const { username, password } = request.body;

    if (!username || !password) {
        return response.status(400).json({
            status: 400,
            message: "Missing login details",
            errors: ["Username and password are required"]
        });
    }

    try {
        const foundUser = await User.findOne({ username }).exec();

        if (!foundUser) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["This username does not exist"]
            });
        }

        const isPasswordCorrect = await checkPassword(password, foundUser.password);

        if (isPasswordCorrect) {
            const newJwt = createJWT(foundUser._id);
            response.json({ jwt: newJwt, user: foundUser });
            console.log(`${foundUser.username} has logged in!`);
        } else {
            return response.status(401).json({
                status: 401,
                message: "Incorrect password",
                errors: ["The password you entered is incorrect"]
            });
        }
    } catch (error) {
        console.error("Error logging in:", error);
        return response.status(500).json({
            status: 500,
            message: "Error logging in",
            errors: [error.message]
        });
    }
});

module.exports = router;