const express = require("express");
const router = express.Router();
const { User, Game, Event } = require("../models/models");
const { createJWT, checkPassword, authenticateJWT, handleValidationError, validatePassword, sendErrorResponse, sendSuccessResponse, sendPasswordResetEmail } = require("../utils/_utils");
const bcrypt = require("bcryptjs")

// STATIC ROUTES //

/**
 * Route to POST (register) a new user.
 * Requires body to include email, password, username, and (optional) location
 */
router.post("/register", async (request, response, next) => {
    let { email, password, username, location, securityQuestionOne, securityQuestionTwo, securityQuestionThree } = request.body;

    if (securityQuestionOne) securityQuestionOne = securityQuestionOne.toLowerCase();
    if (securityQuestionTwo) securityQuestionTwo = securityQuestionTwo.toLowerCase();
    if (securityQuestionThree) securityQuestionThree = securityQuestionThree.toLowerCase();

    const newUser = new User({
        email,
        password,
        username,
        location,
        securityQuestionOne,
        securityQuestionTwo,
        securityQuestionThree
    });

    // Validate the password format
    if (!validatePassword(password)) {
        return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
    }

    try {
        // Save the new user to the database
        await newUser.save();
        // Create a JWT for the new user
        const jwt = createJWT(newUser._id);
        sendSuccessResponse(response, 201, "User registered successfully", { jwt, user: newUser });
    } catch (error) {
        // Handle validation errors
        handleValidationError(error, response);
    }
});

/**
 * Route to POST (login) an existing user.
 * Requires body to include username and password
 */
router.post("/login", async (request, response  , next) => {
    const { username, password } = request.body;

    // Check if username and password are provided
    if (!username || !password) {
        return sendErrorResponse(response, 400, "Missing login details", ["Username and password are required"]);
    }

    try {
        // Find the user by username
        const foundUser = await User.findOne({ username }).exec();

        if (!foundUser) {
            return sendErrorResponse(response, 404, "User not found", ["This username does not exist"]);
        }

        // Check if the provided password is correct
        const isPasswordCorrect = await checkPassword(password, foundUser.password);

        if (isPasswordCorrect) {
            // Create a JWT for the logged-in user
            const jwt = createJWT(foundUser._id);
            sendSuccessResponse(response, 200, `${foundUser.username} has logged in!`, { jwt: jwt, user: foundUser });
        } else {
            return sendErrorResponse(response, 401, "Incorrect password", ["The password you entered is incorrect"]);
        }
    } catch (error) {
        console.error("Error logging in:", error);
        next(error);
    }
});

/**
 * Route to POST (request) a password reset.
 * Provides Security Question challenges
 */
router.post('/password-reset', async (request, response, next) => {
    let { email, securityQuestionOne, securityQuestionTwo, securityQuestionThree, password } = request.body;

    if (securityQuestionOne) securityQuestionOne = securityQuestionOne.toLowerCase();
    if (securityQuestionTwo) securityQuestionTwo = securityQuestionTwo.toLowerCase();
    if (securityQuestionThree) securityQuestionThree = securityQuestionThree.toLowerCase();
    
    try {
        // Find the user by email
        const user = await User.findOne({ email }).exec();

        if (!user) {
            return sendErrorResponse(response, 404, 'User not found', ['No user with that email address exists.']);
        }

        if (user.securityQuestionOne !== securityQuestionOne || user.securityQuestionTwo !== securityQuestionTwo || user.securityQuestionThree !== securityQuestionThree) {
            return sendErrorResponse(response, 401, "Incorrect security details provided", ["You have not correctly provided at least one of your security answers"])
        }
        // validate and hash the new password
        if (!validatePassword(password)) {
            return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
        }

        user.password = password
        await user.save();

        sendSuccessResponse(response, 200, 'Password reset successfully', {});
    } catch (error) {
        next(error);
    }
});

// ROUTES WITH PARAMETERS //

/**
 * Route to GET (display) all events user is participating in or hosting based on the filter.
 * Requires authentication.
 */
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
});

/**
 * Route to GET a user's game collection with optional search query.
 * Requires authentication.
 */
router.get("/collection", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const query = request.query.search;

        // Find the user and populate the gamesOwned field
        const user = await User.findById(userId).populate("gamesOwned").exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        let games = user.gamesOwned;

        // Filter games by search query if provided
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
});

/**
 * Route to PATCH (update) an existing user's details.
 * Requires authentication.
 * NOT FOR PASSWORDS
 */

router.patch("/update", authenticateJWT, async (request, response, next) => {
    console.log("Received update request");
    const userId = request.user.id;
    const updatedDetails = request.body;

    if (updatedDetails.password) {
        if (!validatePassword(updatedDetails.password)) {
            console.log("Password validation failed");
            return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
        }
        updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
    }

    try {
        // Update the user details in the database
        console.log("Updating user details");
        const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            console.log("User not found");
            return sendErrorResponse(response, 404, "User not found", ["This user does not exist"]);
        }

        sendSuccessResponse(response, 200, "User details have been updated!", { updatedUser });
    } catch (error) {
        console.log("Error updating user details:", error);
        next(error);
    }
});

// /**
//  * Route to POST (reset) password using a token.
//  * Removed route as now being handled with security questions.
//  */
// router.post('/reset/:token', async (request, response, next) => {
//     try {
//         const { token } = request.params;
//         const { newPassword } = request.body;

//         // Check if new password is provided and valid
//         if (!newPassword) {
//             return sendErrorResponse(response, 400, 'New password is required', ['Please provide a new password.']);
//         }

//         if (!validatePassword(newPassword)) {
//             return sendErrorResponse(response, 400, 'Invalid password format', ['Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.']);
//         }

//         // Find the user by the reset token and check if the token has not expired
//         const user = await User.findOne({
//             resetPasswordToken: token,
//             resetPasswordExpires: { $gt: Date.now() } // Check if the token has not expired
//         }).exec();

//         if (!user) {
//             return sendErrorResponse(response, 400, 'Invalid or expired token', ['The password reset token is invalid or has expired.']);
//         }

//         // Update the user's password and clear the reset token and expiry
//         user.password = await bcrypt.hash(newPassword, 10);
//         user.resetPasswordToken = undefined; // Clear the reset token
//         user.resetPasswordExpires = undefined; // Clear the token expiration

//         await user.save();

//         sendSuccessResponse(response, 200, 'Password has been reset successfully', {});
//     } catch (error) {
//         next(error);
//     }
// }); 

/**
 * Route to DELETE a game from the user's collection.
 * Requires authentication.
 */
router.delete("/collection/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const gameId = request.params.id;
        
        // Find the game by ID
        const game = await Game.findById(gameId).exec();
        if (!game) {
            return sendErrorResponse(response, 404, "Game not found", ["This game does not exist"]);
        }
        
        // Find the user by ID
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        // Check if the game is in the user's collection
        const gameInCollection = user.gamesOwned.indexOf(gameId);
        if (gameInCollection === -1) {
            return sendErrorResponse(response, 400, "Game not in collection", ["The specified game is not in the user's collection"]);
        }

        // Remove the game from the user's collection
        user.gamesOwned.splice(gameInCollection, 1);
        await user.save();

        sendSuccessResponse(response, 200, `Game: ${game.name} has been removed from ${user.username}'s collection successfully`, {});
    } catch (error) {
        console.error("Error removing game from collection:", error);
        next(error);
    }
});

/**
 * Route to DELETE the current logged-in user.
 * Requires authentication.
 */
router.delete("/", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        // Remove all events user is a host of
        await Event.deleteMany({ host: userId })
        
        // Find all events where the user is a participant and remove them from the participants array
        await Event.updateMany(
            { participants: userId },
            { $pull: { participants: userId } }
        );

        // Delete the user from the database
        await User.findByIdAndDelete(userId);
        
        sendSuccessResponse(response, 200, "User deleted successfully", {});
    } catch (error) {
        next(error);
    }
}); 

// CATCH-ALL //

/**
 * Route to GET and display all information on the user.
 * Requires authentication.
 */
router.get("/", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;

        // Find the user by ID
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }
        
        // Send the user's details in the response
        sendSuccessResponse(response, 200, "User retrieved successfully", {
            id: user._id,
            username: user.username,
            email: user.email,
            location: user.location || "" ,
            bio: user.bio || ""
        });
    } catch (error) {
        console.error("Error retrieving user: ", error);
        next(error);
    }
});

module.exports = router;