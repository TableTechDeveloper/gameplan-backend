const express = require("express");
const router = express.Router();
const { User, Game } = require("../models/models");
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
        console.log("Password has been updated!")
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
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["The user is not found or not logged in"]
            });
        }
        response.status(200).json({
            status: 200,
            games: user.gamesOwned
        });
    } catch (error) {
        console.error("Error retrieving games: ", error);
        response.status(500).json({
            status: 500,
            message: "Error retrieving games",
            errors: [error.message]
        })
    }
})

/**
 * Route to GET a user's game collection filtered by a search query.
 * Requires the user to be authenticated.
 */
router.get("/collection/search", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const query = request.query.query;

        if (!query) {
            return response.status(400).json({
                status: 400,
                message: "Missing search query",
                errors: ["Search term is required"]
            });
        }

        const user = await User.findById(userId).populate("gamesOwned").exec();
        if (!user) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["The user is not found or not logged in"]
            });
        }

        // Filter gamesOwned by the search query
        const filteredGames = user.gamesOwned.filter(game =>
            game.name.toLowerCase().includes(query.toLowerCase())
        );

        response.status(200).json({
            status: 200,
            games: filteredGames
        });
    } catch (error) {
        console.error("Error searching games: ", error);
        response.status(500).json({
            status: 500,
            message: "Error searching games",
            errors: [error.message]
        });
    }
});

// Delete game from user's collection
router.delete("/collection/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const gameId = request.params.id;
        const game = await Game.findById(gameId).exec();
        if (!game) {
            return response.status(404).json({
                status: 404,
                message: "Game not found",
                errors: ["This game does not exist"]
            })
        }
        const user = await User.findById(userId).exec();
        if (!user) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["The user is not found or not logged in"]
            });
        }
    
        // Check if game is in users collection
        const gameInCollection = user.gamesOwned.indexOf(gameId);
        if (gameInCollection === -1) {
            return response.status(400).json({
                status: 400,
                message: "Game not in collection",
                errors: ["The specified game is not in the user's collection"]
            });
        }

        user.gamesOwned.splice(gameInCollection, 1);
        await user.save()

        response.status(200).json({
            status: 200,
            message: `Game: ${game.name} has been removed from ${user.username}'s collection successfully`
        });

    } catch (error) {
        console.error("Error removing game from collection:", error);
        response.status(500).json({
            status: 500,
            message: "Error removing game from collection",
            errors: [error.message]
        })
    }
})

// ROUTE to display all information on user
router.get("/", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const user = await User.findById(userId).exec();
        if (!user) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["The user is not found or not logged in"]
            });
        }
        response.status(200).json({
            status: 200,
            username: user.username,
            email: user.email,
            location: user.location,
            bio: user.bio
        })
    } catch (error) {
        console.error("Error retrieving user: ", error);
        response.status(500).json({
            status: 500,
            message: "Error retrieving user",
            errors: [error.message]
        })
    }
})

module.exports = router;