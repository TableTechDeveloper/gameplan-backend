const express = require("express");
const router = express.Router();
const { authenticateJWT } = require("../utils/authHelpers");
const { searchForSingleGame, searchForMultipleGames, fetchBoardGameData } = require("../utils/boardgamegeekApiParse");
const { User, Game } = require("../models/models");

// Route to search for games
router.get("/search", authenticateJWT, async (request, response, next) => {
    const { query, strict } = request.query;

    if (!query) {
        return response.status(400).json({
            status: 400,
            message: "Missing search query", 
            errors: ["Search terms are required"]
        });
    }
    try {
        let gameData;
        if (strict === "true") {
            gameData = await searchForSingleGame(query);
        } else {
            gameData = await searchForMultipleGames(query);
        }
        console.log("Game Data: ", gameData)
        if (!gameData || gameData.length === 0) {
            return response.status(404).json({
                status: 404,
                message: "No games found",
                errors: ["No games match the search query"]
            });
        }
        response.json({
            status: 200,
            games: gameData
        });
    } catch (error) {
        console.error("Error searching for games: ", error);
        response.status(500).json({
            status: 500,
            message: "Error searching for games",
            errors: [error.message]
        });
    }
});

// Route to fetch detailed game data by ID
router.get("/:id", authenticateJWT, async (request, response, next) => {
    const gameId = request.params.id;

    try {
        const gameData = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${gameId}`);
        if (!gameData) {
            return response.status(404).json({
                status: 404,
                message: "Game not found",
                errors: ["The specified game does not exist"]
            });
        }

        response.json({
            status: 200,
            game: gameData
        });
    } catch (error) {
        console.error("Error fetching game data: ", error);
        response.status(500).json({
            status: 500,
            message: "Error fetching game data",
            errors: [error.message]
        });
    }
});

// Route to add a game to the user's collection
router.post("/add", authenticateJWT, async (request, response, next) => {
    const userId = request.user.id;
    const { gameId } = request.body;

    if (!gameId) {
        return response.status(400).json({
            status: 400,
            message: "Missing game ID",
            errors: ["Game ID is required"]
        });
    }

    try {
        // Check if the game exists in the Game collection
        let game = await Game.findOne({ boardgamegeekref: gameId }).exec();
        
        // If the game does not exist, fetch the details and create a new document
        if (!game) {
            const gameDetails = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${gameId}`);
            if (!gameDetails) {
                return response.status(404).json({
                    status: 404,
                    message: "Game not found",
                    errors: ["The specified game does not exist"]
                });
            }
            game = new Game({
                name: gameDetails.name,
                boardgamegeekref: gameDetails.boardgamegeekref,
                yearpublished: gameDetails.yearpublished,
                minplayers: gameDetails.minplayers,
                maxplayers: gameDetails.maxplayers,
                playtime: gameDetails.playtime,
                description: gameDetails.description,
                thumbnail: gameDetails.thumbnail,
                image: gameDetails.image
            });
            await game.save();
        }

        // Check if the user exists
        const user = await User.findById(userId).exec();
        if (!user) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["The authenticated user does not exist"]
            });
        }

        // Check if the game is already in the user's collection
        if (user.gamesOwned.includes(game._id)) {
            return response.status(400).json({
                status: 400,
                message: "Game already in collection",
                errors: ["The specified game is already in the user's collection"]
            });
        }

        // Add the game to the user's collection
        user.gamesOwned.push(game._id);
        await user.save();

        response.status(200).json({
            status: 200,
            message: "Game added to collection successfully",
            user
        });
    } catch (error) {
        console.error("Error adding game to collection:", error);
        response.status(500).json({
            status: 500,
            message: "Error adding game to collection",
            errors: [error.message]
        });
    }
});

module.exports = router;