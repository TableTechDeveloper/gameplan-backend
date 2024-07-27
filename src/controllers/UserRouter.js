const express = require("express");
const router = express.Router();
const { User } = require("../models/models");
const { createJWT, checkPassword } = require("../utils/authHelpers");

/**
 * Route to POST a new user registering.
 * Requires body to include email, password, username, and (optional) location
 */
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
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(val => val.message);
            return response.status(400).json({
                error: "Validation failed",
                messages: messages
            });
        } else if (error.code === 11000) {
            return response.status(400).json({
                error: "Duplicate key error",
                message: "This email address or username is already in use!"
            });
        } else {
            return response.status(500).json({
                error: "Error registering new user",
                message: error.message
            });
        }
    }
});

/**
 * Route to POST an existing user login
 * Requires username and password
 */
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
        return response.status(500).json({
            status: 500,
            message: "Error logging in",
            errors: [error.message]
        });
    }
});

module.exports = router;