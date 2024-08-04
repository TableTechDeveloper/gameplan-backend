const express = require("express");
const router = express.Router();
const { User, Game, Event } = require("../models/models");
<<<<<<< Updated upstream
const { createJWT, checkPassword, authenticateJWT, handleValidationError, validatePassword, sendErrorResponse, sendSuccessResponse, sendPasswordResetEmail } = require("../utils/_utils");
=======
const {
  createJWT,
  checkPassword,
  authenticateJWT,
} = require("../utils/authHelpers");
const {
  handleValidationError,
  validatePassword,
} = require("../utils/validation");
const {
  sendErrorResponse,
  sendSuccessResponse,
} = require("../utils/responseHelpers");
>>>>>>> Stashed changes
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// STATIC ROUTES //

/**
 * Route to POST (register) a new user.
 * Requires body to include email, password, username, and (optional) location
 */
router.post("/register", async (request, response, next) => {
  const { email, password, username, location } = request.body;

  const newUser = new User({
    email,
    password,
    username,
    location,
  });

  if (!validatePassword(password)) {
    return sendErrorResponse(
      response,
      400,
      "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character."
    );
  }

  try {
    await newUser.save();
    const token = createJWT(newUser._id);
    sendSuccessResponse(response, 201, "User registered successfully", {
      token,
      user: newUser,
    });
<<<<<<< Updated upstream

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
=======
  } catch (error) {
    handleValidationError(error, response);
  }
>>>>>>> Stashed changes
}); // TESTED

/**
 * Route to POST (login) an existing user.
 * Requires body to include username and password
 */
router.post("/login", async (request, response, next) => {
  const { username, password } = request.body;

<<<<<<< Updated upstream
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
=======
  if (!username || !password) {
    return sendErrorResponse(response, 400, "Missing login details", [
      "Username and password are required",
    ]);
  }

  try {
    const foundUser = await User.findOne({ username }).exec();

    if (!foundUser) {
      return sendErrorResponse(response, 404, "User not found", [
        "This username does not exist",
      ]);
    }

    const isPasswordCorrect = await checkPassword(password, foundUser.password);

    if (isPasswordCorrect) {
      const newJwt = createJWT(foundUser._id);
      sendSuccessResponse(
        response,
        200,
        `${foundUser.username} has logged in!`,
        { jwt: newJwt, user: foundUser }
      );
    } else {
      return sendErrorResponse(response, 401, "Incorrect password", [
        "The password you entered is incorrect",
      ]);
>>>>>>> Stashed changes
    }
  } catch (error) {
    console.error("Error logging in:", error);
    next(error);
  }
}); // TESTED

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

<<<<<<< Updated upstream
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
=======
    if (isHosted) {
      // Fetch events hosted by the user
      events = await Event.find({ host: userId }).exec();
      console.log("Hosted events: ", events);
    } else {
      // Fetch events the user is participating in
      const user = await User.findById(userId)
        .populate("eventsAttending")
        .exec();
      if (!user) {
        return sendErrorResponse(response, 404, "User not found", [
          "The user is not found or not logged in",
        ]);
      }
      console.log("User: ", user);
      console.log("Events Attending: ", user.eventsAttending);
      events = user.eventsAttending;
>>>>>>> Stashed changes
    }

    sendSuccessResponse(response, 200, "Events retrieved successfully", {
      events,
    });
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

<<<<<<< Updated upstream
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
=======
    const user = await User.findById(userId).populate("gamesOwned").exec();
    if (!user) {
      return sendErrorResponse(response, 404, "User not found", [
        "The user is not found or not logged in",
      ]);
>>>>>>> Stashed changes
    }

    let games = user.gamesOwned;

    if (query) {
      games = games.filter((game) =>
        game.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    sendSuccessResponse(response, 200, "Games retrieved successfully", {
      games,
    });
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

<<<<<<< Updated upstream
    // If the password is being updated, validate and hash it
    if (updatedDetails.password) {
        if (!validatePassword(updatedDetails.password)) {
            return sendErrorResponse(response, 400, "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.");
        }
        updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
    }

    try {
        // Update the user details in the database
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
=======
  if (updatedDetails.password) {
    if (!validatePassword(updatedDetails.password)) {
      return sendErrorResponse(
        response,
        400,
        "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character."
      );
    }
    updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return sendErrorResponse(response, 404, "User not found", [
        "This user does not exist",
      ]);
    }

    sendSuccessResponse(response, 200, "User details have been updated!", {
      updatedUser,
    });
  } catch (error) {
    handleValidationError(error, response);
  }
}); // TESTED, NEXT => CHANGE CODE TO DISALLOW PASSWORD PATCHING
>>>>>>> Stashed changes

/**
 * Route to POST (request) a password reset.
 * Generates a reset token and sends an email with the reset link.
 */
<<<<<<< Updated upstream
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

        // Save the user object with the reset token
        await user.save();

        // Send the email with the reset link
        sendPasswordResetEmail(user.email, resetToken, request.headers.host, response);

        sendSuccessResponse(response, 200, 'Password reset email sent successfully', {});
    } catch (error) {
        next(error);
    }
}); // TESTED

/**
 * Route to POST (reset) password using a token.
 */
router.post('/reset/:token', async (request, response, next) => {
    try {
        const { token } = request.params;
        const { newPassword } = request.body;

        // Check if new password is provided and valid
        if (!newPassword) {
            return sendErrorResponse(response, 400, 'New password is required', ['Please provide a new password.']);
        }

        if (!validatePassword(newPassword)) {
            return sendErrorResponse(response, 400, 'Invalid password format', ['Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.']);
        }

        // Find the user by the reset token and check if the token has not expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Check if the token has not expired
        }).exec();

        if (!user) {
            return sendErrorResponse(response, 400, 'Invalid or expired token', ['The password reset token is invalid or has expired.']);
        }

        // Update the user's password and clear the reset token and expiry
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined; // Clear the reset token
        user.resetPasswordExpires = undefined; // Clear the token expiration

        await user.save();

        sendSuccessResponse(response, 200, 'Password has been reset successfully', {});
    } catch (error) {
        next(error);
    }
}); // TESTED
=======
router.patch(
  "/password-reset",
  authenticateJWT,
  async (request, response, next) => {
    const userId = request.user.id;
    const updatedDetails = request.body;

    if (updatedDetails.password) {
      if (!validatePassword(updatedDetails.password)) {
        return sendErrorResponse(
          response,
          400,
          "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character."
        );
      }
      updatedDetails.password = await bcrypt.hash(updatedDetails.password, 10);
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
        new: true,
        runValidators: true,
      });

      if (!updatedUser) {
        return sendErrorResponse(response, 404, "User not found", [
          "This user does not exist",
        ]);
      }

      sendSuccessResponse(response, 200, "User details have been updated!", {
        updatedUser,
      });
    } catch (error) {
      handleValidationError(error, response);
    }
  }
); // UNBUILT, NEXT => PATH TO RESET USER PASSWORD (DO WE USE MAILER?)
>>>>>>> Stashed changes

/**
 * Route to DELETE a game from the user's collection.
 * Requires authentication.
 */
router.delete(
  "/collection/:id",
  authenticateJWT,
  async (request, response, next) => {
    try {
<<<<<<< Updated upstream
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
=======
      const userId = request.user.id;
      const gameId = request.params.id;
      const game = await Game.findById(gameId).exec();
      if (!game) {
        return sendErrorResponse(response, 404, "Game not found", [
          "This game does not exist",
        ]);
      }
      const user = await User.findById(userId).exec();
      if (!user) {
        return sendErrorResponse(response, 404, "User not found", [
          "The user is not found or not logged in",
        ]);
      }

      const gameInCollection = user.gamesOwned.indexOf(gameId);
      if (gameInCollection === -1) {
        return sendErrorResponse(response, 400, "Game not in collection", [
          "The specified game is not in the user's collection",
        ]);
      }

      user.gamesOwned.splice(gameInCollection, 1);
      await user.save();
>>>>>>> Stashed changes

      sendSuccessResponse(
        response,
        200,
        `Game: ${game.name} has been removed from ${user.username}'s collection successfully`,
        {}
      );
    } catch (error) {
      console.error("Error removing game from collection:", error);
      next(error);
    }
  }
); // TESTED

/**
 * Route to DELETE the current logged-in user.
 * Requires authentication.
 */
router.delete("/", authenticateJWT, async (request, response, next) => {
<<<<<<< Updated upstream
    try {
        const userId = request.user.id;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }

        // Delete the user from the database
        await User.findByIdAndDelete(userId);
        
        sendSuccessResponse(response, 200, "User deleted successfully", {});
    } catch (error) {
        next(error);
=======
  try {
    const userId = request.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(response, 404, "User not found", [
        "The user is not found or not logged in",
      ]);
>>>>>>> Stashed changes
    }

    await User.findByIdAndDelete(userId);

    sendSuccessResponse(response, 200, "User deleted successfully", {});
  } catch (error) {
    next(error);
  }
}); // TESTED

// CATCH-ALL //

/**
 * Route to GET and display all information on the user.
 * Requires authentication.
 */
router.get("/", authenticateJWT, async (request, response, next) => {
<<<<<<< Updated upstream
    try {
        const userId = request.user.id;

        // Find the user by ID
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }
        
        // Send the user's details in the response
        sendSuccessResponse(response, 200, "User retrieved successfully", {
            username: user.username,
            email: user.email,
            location: user.location,
            bio: user.bio
        });
    } catch (error) {
        console.error("Error retrieving user: ", error);
        next(error);
=======
  try {
    const userId = request.user.id;
    const user = await User.findById(userId).exec();
    if (!user) {
      return sendErrorResponse(response, 404, "User not found", [
        "The user is not found or not logged in",
      ]);
>>>>>>> Stashed changes
    }
    sendSuccessResponse(response, 200, "User retrieved successfully", {
      username: user.username,
      email: user.email,
      location: user.location,
      bio: user.bio,
    });
  } catch (error) {
    console.error("Error retrieving user: ", error);
    next(error);
  }
}); // TESTED

module.exports = router;
