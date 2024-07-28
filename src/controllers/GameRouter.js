const express = require("express");
const router = express.Router();
const { authenticateJWT } = require("../utils/authHelpers");
const { searchForSingleGame, searchForMultipleGames, fetchBoardGameData } = require("../utils/boardgamegeekApi");
const { User, Game } = require("../models/models");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseHelpers");

// Route to search for games.
router.get("/search", authenticateJWT, async (request, response, next) => {
    const { query, strict } = request.query;

    if (!query) {
        return sendErrorResponse(response, 400, "Missing search query", ["Search terms are required"]);
    }
    try {
        let gameData;
        if (strict === "true") {
            gameData = await searchForSingleGame(query);
        } else {
            gameData = await searchForMultipleGames(query);
        }
        if (!gameData || gameData.length === 0) {
            return sendErrorResponse(response, 404, "No games found", ["No games match the search query"]);
        }
        sendSuccessResponse(response, 200, "Games retrieved successfully", { games: gameData });
    } catch (error) {
        next(error);
    }
});

// Route to fetch detailed game data by ID.
router.get("/:id", authenticateJWT, async (request, response, next) => {
    const gameId = request.params.id;

    try {
        const gameData = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${gameId}`);
        if (!gameData) {
            return sendErrorResponse(response, 404, "Game not found", ["The specified game does not exist"]);
        }

        sendSuccessResponse(response, 200, "Game retrieved successfully", { game: gameData });
    } catch (error) {
        next(error);
    }
});

// Route to add a game to the user's collection.
router.post("/add", authenticateJWT, async (request, response, next) => {
    const userId = request.user.id;
    const { gameId } = request.body;

    if (!gameId) {
        return sendErrorResponse(response, 400, "Missing game ID", ["Game ID is required"]);
    }

    try {
        // Check if the game exists in the Game collection
        let game = await Game.findOne({ boardgamegeekref: gameId }).exec();
        
        // If the game does not exist, fetch the details and create a new document
        if (!game) {
            const gameDetails = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${gameId}`);
            if (!gameDetails) {
                return sendErrorResponse(response, 404, "Game not found", ["The specified game does not exist"]);
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
            return sendErrorResponse(response, 404, "User not found", ["The authenticated user does not exist"]);
        }

        // Check if the game is already in the user's collection
        if (user.gamesOwned.includes(game._id)) {
            return sendErrorResponse(response, 400, "Game already in collection", ["The specified game is already in the user's collection"]);
        }

        // Add the game to the user's collection
        user.gamesOwned.push(game._id);
        await user.save();

        sendSuccessResponse(response, 200, "Game added to collection successfully", { user });
    } catch (error) {
        next(error);
    }
});

module.exports = router;