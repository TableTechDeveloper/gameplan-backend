const express = require("express");
const router = express.Router();
const { User, Game } = require("../models/models");
const { createJWT, checkPassword, authenticateJWT } = require("../utils/authHelpers");
const { handleValidationError, validatePassword } = require("../utils/validation");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseHelpers");
const bcrypt = require("bcryptjs");

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

    if(!validatePassword(password)) {
        return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
    }

    try {
        await newUser.save();
        const token = createJWT(newUser._id);
        sendSuccessResponse(response, 201, "User registered successfully", { token, user: newUser });
    } catch (error) {
        handleValidationError(error, response);
    }
});

/**
 * Route to POST an existing user login.
 * Requires body to include username and password
 */
router.post("/login", async (request, response, next) => {
    const { username, password } = request.body;

    if (!username || !password) {
        return sendErrorResponse(response, 400, "Missing login details", ["Username and password are required"]);
    }

    try {
        const foundUser = await User.findOne({ username }).exec();

        if (!foundUser) {
            return sendErrorResponse(response, 404, "User not found", ["This username does not exist"]);
        }

        const isPasswordCorrect = await checkPassword(password, foundUser.password);

        if (isPasswordCorrect) {
            const newJwt = createJWT(foundUser._id);
            sendSuccessResponse(response, 200, `${foundUser.username} has logged in!`, { jwt: newJwt, user: foundUser });
        } else {
            return sendErrorResponse(response, 401, "Incorrect password", ["The password you entered is incorrect"]);
        }
    } catch (error) {
        console.error("Error logging in:", error);
        sendErrorResponse(response, 500, "Error logging in", [error.message]);
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
            return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
        }
        updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            return sendErrorResponse(response, 404, "User not found", ["This user does not exist"]);
        }

        sendSuccessResponse(response, 200, "Password has been updated!", { updatedUser });
    } catch (error) {
        handleValidationError(error, response);
    }
});

// Route to GET a users game collection
router.get("/collection", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;

        const user = await User.findById(userId).populate("gamesOwned").exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }
        sendSuccessResponse(response, 200, "Games retrieved successfully", { games: user.gamesOwned });
    } catch (error) {
        console.error("Error retrieving games: ", error);
        sendErrorResponse(response, 500, "Error retrieving games", [error.message]);
    }
});

/**
 * Route to GET a user's game collection filtered by a search query.
 * Requires the user to be authenticated.
 */
router.get("/collection/search", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const query = request.query.query;

        if (!query) {
            return sendErrorResponse(response, 400, "Missing search query", ["Search term is required"]);
        }

        const user = await User.findById(userId).populate("gamesOwned").exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        const filteredGames = user.gamesOwned.filter(game =>
            game.name.toLowerCase().includes(query.toLowerCase())
        );

        sendSuccessResponse(response, 200, "Games retrieved successfully", { games: filteredGames });
    } catch (error) {
        console.error("Error searching games: ", error);
        sendErrorResponse(response, 500, "Error searching games", [error.message]);
    }
});

// Delete game from user's collection
router.delete("/collection/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const gameId = request.params.id;
        const game = await Game.findById(gameId).exec();
        if (!game) {
            return sendErrorResponse(response, 404, "Game not found", ["This game does not exist"]);
        }
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        const gameInCollection = user.gamesOwned.indexOf(gameId);
        if (gameInCollection === -1) {
            return sendErrorResponse(response, 400, "Game not in collection", ["The specified game is not in the user's collection"]);
        }

        user.gamesOwned.splice(gameInCollection, 1);
        await user.save();

        sendSuccessResponse(response, 200, `Game: ${game.name} has been removed from ${user.username}'s collection successfully`, {});
    } catch (error) {
        console.error("Error removing game from collection:", error);
        sendErrorResponse(response, 500, "Error removing game from collection", [error.message]);
    }
});

// ROUTE to display all information on user
router.get("/", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }
        sendSuccessResponse(response, 200, "User retrieved successfully", {
            username: user.username,
            email: user.email,
            location: user.location,
            bio: user.bio
        });
    } catch (error) {
        console.error("Error retrieving user: ", error);
        sendErrorResponse(response, 500, "Error retrieving user", [error.message]);
    }
});

module.exports = router;