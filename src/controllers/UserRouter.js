const express = require("express");
const router = express.Router();
const { User, Game, Event } = require("../models/models");
const { createJWT, checkPassword, authenticateJWT } = require("../utils/authHelpers");
const { handleValidationError, validatePassword } = require("../utils/validation");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseHelpers");
const bcrypt = require("bcryptjs");
const sendPasswordResetEmail = require("../utils/passwordReset");
const crypto = require("crypto");

// STATIC ROUTES
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

    if (!validatePassword(password)) {
        return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
    }

    try {
        await newUser.save();
        const token = createJWT(newUser._id);
        sendSuccessResponse(response, 201, "User registered successfully", { token, user: newUser });
    } catch (error) {
        handleValidationError(error, response);
    }
}); // TESTED

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
        next(error);
    }
}); // TESTED

// ROUTES WITH PARAMETERS
// Route to display all events user is participating in or hosting based on the filter
router.get("/events", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const isHosted = request.query.hosted === "true";

        let events;

        if (isHosted) {
            // Fetch events hosted by the user
            events = await Event.find({ host: userId }).populate("host", "username email").populate("participants", "username").exec();
        } else {
            // Fetch events the user is participating in
            const user = await User.findById(userId).populate({
                path: "eventsAttending",
                populate: [
                    { path: "host", select: "username email" },
                    { path: "participants", select: "username" }
                ]
            }).exec();
            if (!user) {
                return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
            }
            console.log("User: ", user);
            console.log("Events Attending: ", user.eventsAttending);
            events = user.eventsAttending;
        }

        sendSuccessResponse(response, 200, "Events retrieved successfully", { events });
    } catch (error) {
        console.error("Error retrieving events:", error);
        next(error);
    }
}); // TESTED

/**
 * Route to GET a user's game collection with optional search query.
 * Requires authentication.
 */
router.get("/collection", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const query = request.query.search;

        const user = await User.findById(userId).populate("gamesOwned").exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        let games = user.gamesOwned;

        if (query) {
            games = games.filter(game =>
                game.name.toLowerCase().includes(query.toLowerCase())
            );
        }

        sendSuccessResponse(response, 200, "Games retrieved successfully", { games });
    } catch (error) {
        console.error("Error retrieving games:", error);
        next(error);
    }
}); // TESTED

/**
 * Route to PATCH (update) an existing user's details.
 * Requires authentication.
 * NOT FOR PASSWORDS
 */
router.patch("/update", authenticateJWT, async (request, response, next) => {
    const userId = request.user.id;
    const updatedDetails = request.body;

    if (updatedDetails.password) {
        if (!validatePassword(updatedDetails.password)) {
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

        sendSuccessResponse(response, 200, "User details have been updated!", { updatedUser });
    } catch (error) {
        handleValidationError(error, response);
    }
}); // TESTED

/**
 * Route to request a password reset.
 * Generates a reset token and sends an email with the reset link.
 */
router.post('/password-reset', async (request, response, next) => {
    try {
        const { email } = request.body;

        // Find the user by email
        const user = await User.findOne({ email }).exec();
        if (!user) {
            return sendErrorResponse(response, 404, 'User not found', ['No user with that email address exists.']);
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Set reset token and expiry on user object
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        // Save the user object
        await user.save();

        // Send the email
        sendPasswordResetEmail(user.email, resetToken, request.headers.host, response);

        sendSuccessResponse(response, 200, 'Password reset email sent successfully', {});
    } catch (error) {
        next(error);
    }
}); // TESTED, PATH TO RESET USER PASSWORD (DO WE USE MAILER?)

router.post('/reset/:token', async (request, response, next) => {
    try {
        const { token } = request.params;
        const { newPassword } = request.body;

        if (!newPassword) {
            return sendErrorResponse(response, 400, 'New password is required', ['Please provide a new password.']);
        }

        if (!validatePassword(newPassword)) {
            return sendErrorResponse(response, 400, 'Invalid password format', ['Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.']);
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Check if the token has not expired
        }).exec();

        if (!user) {
            return sendErrorResponse(response, 400, 'Invalid or expired token', ['The password reset token is invalid or has expired.']);
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined; // Clear the reset token
        user.resetPasswordExpires = undefined; // Clear the token expiration

        await user.save();

        sendSuccessResponse(response, 200, 'Password has been reset successfully', {});
    } catch (error) {
        next(error);
    }
});

/**
 * Route to DELETE a game from the user's collection.
 * Requires authentication.
 */
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
        next(error);
    }
}); // TESTED

/**
 * Route to DELETE the current logged-in user.
 * Requires authentication.
 */
router.delete("/", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        await User.findByIdAndDelete(userId);
        
        sendSuccessResponse(response, 200, "User deleted successfully", {});
    } catch (error) {
        next(error);
    }
}); // TESTED

// CATCH-ALL
/**
 * Route to display all information on the user.
 * Requires authentication.
 */
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
        next(error);
    }
}); // TESTED

module.exports = router