const express = require("express");
const router = express.Router();
const { Game, User } = require("../models/models");
const { authenticateJWT } = require("../utils/authHelpers");


// Route to GET a users collection
router.get("/", authenticateJWT, async (request, response, next) => {
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
        response.status(500).jason({
            status: 500,
            message: "Error retrieving games",
            errors: [error.message]
        })
    }
})

module.exports = router