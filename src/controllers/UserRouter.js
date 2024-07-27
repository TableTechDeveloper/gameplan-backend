const express = require("express");
const router = express.Router();
const { User } = require("../models/models");
const { createJWT, checkPassword, authenticateJWT } = require("../utils/authHelpers");
const { handleValidationError, validatePassword } = require("../utils/validation");
const bcrypt = require("bcryptjs")

/**
 * Route to POST a new user registering.
 * Requires body to include email, password, username, and (optional) location
 */
router.post("/register", async (request, response, next) => {
    // Extract user details from the request body
    const { email, password, username, location } = request.body;

    // Create a new User instance with the provided details
    const newUser = new User({
        email,
        password,
        username,
        location
    });

    if(!validatePassword(password)) {
        return response.status(400).json({
            status: 400,
            message: "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character."
        })
    }

    try {
        // Save the new user to the database
        await newUser.save();
        // Create a JWT for the newly registered user
        const token = createJWT(newUser._id);
        // Send a 201 Created response with the token and user details
        response.status(201).json({ token, user: newUser });
    } catch (error) {
        handleValidationError(error, response);
    }
});

/**
 * Route to POST an existing user login.
 * Requires body to include username and password
 */
router.post("/login", async (request, response, next) => {
    // Extract login details from the request body
    const { username, password } = request.body;

    // Check if both username and password are provided
    if (!username || !password) {
        // Send a 400 Bad Request response if either is missing
        return response.status(400).json({
            status: 400,
            message: "Missing login details",
            errors: ["Username and password are required"]
        });
    }

    try {
        // Find the user in the database by username
        const foundUser = await User.findOne({ username }).exec();

        // Check if the user exists
        if (!foundUser) {
            // Send a 404 Not Found response if the user does not exist
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["This username does not exist"]
            });
        }

        // Check if the provided password matches the stored hashed password
        const isPasswordCorrect = await checkPassword(password, foundUser.password);

        // If the password is correct, generate a new JWT
        if (isPasswordCorrect) {
            const newJwt = createJWT(foundUser._id);
            // Send the JWT and user details in the response
            response.json({ jwt: newJwt, user: foundUser });
            console.log(`${foundUser.username} has logged in!`);
        } else {
            // Send a 401 Unauthorized response if the password is incorrect
            return response.status(401).json({
                status: 401,
                message: "Incorrect password",
                errors: ["The password you entered is incorrect"]
            });
        }
    } catch (error) {
        // Log and send a 500 Internal Server Error response if an error occurs
        console.error("Error logging in:", error);
        return response.status(500).json({
            status: 500,
            message: "Error logging in",
            errors: [error.message]
        });
    }
});

/**
 * Route to PATCH an existing user's details.
 * Requires the user to be authenticated.
 */
router.patch("/update", authenticateJWT, async (request, response, next) => {
    const userId = request.user.id;
    const updatedDetails = request.body;

    if (updatedDetails.password) {
        if(!validatePassword(updatedDetails.password)) {
            return response.status(400).json({
                status: 400,
                message: "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character."
            })
        }
        updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["This user does not exist"]
            });
        }

        response.json(updatedUser);
    } catch (error) {
        handleValidationError(error, response);
    }
});

module.exports = router;