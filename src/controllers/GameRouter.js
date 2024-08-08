const express = require("express");
const router = express.Router();
const { authenticateJWT, searchForSingleGame, searchForMultipleGames, fetchBoardGameData, sendErrorResponse, sendSuccessResponse } = require("../utils/_utils");
const { User, Game } = require("../models/models");

// STATIC ROUTES //

// ROUTES WITH PARAMETERS //

/**
 * Route to POST (add) a game to the user's collection.
 * Requires authentication.
 */
router.post("/add", authenticateJWT, async (request, response, next) => {
    const userId = request.user.id;
    const { gameId } = request.body;

    // Check if gameId is provided in the request body
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
                image: gameDetails.image,
                url: `https://boardgamegeek.com/boardgame/${gameId}`
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

        sendSuccessResponse(response, 200, `${game.name} added to collection successfully`);
    } catch (error) {
        next(error);
    }
});

/**
 * Route to GET (search for) games.
 * Requires authentication.
 */
router.get("/search", authenticateJWT, async (request, response, next) => {
    const { query, strict } = request.query;

    // Check if search query is provided
    if (!query) {
        return sendErrorResponse(response, 400, "Missing search query", ["Search terms are required"]);
    }
    try {
        let gameData;
        // Search for a single game if strict mode is enabled, otherwise search for multiple games
        if (strict === "true") {
            gameData = await searchForSingleGame(query);
        } else {
            gameData = await searchForMultipleGames(query);
        }

        // Check if any games were found
        if (!gameData || gameData.length === 0) {
            return sendErrorResponse(response, 404, "No games found", ["No games match the search query"]);
        }
        sendSuccessResponse(response, 200, "Games retrieved successfully", { games: gameData });
    } catch (error) {
        next(error);
    }
}); 

/**
 * Route to GET (fetch detailed) game data by ID.
 * Requires authentication.
 */
router.get("/:id", authenticateJWT, async (request, response, next) => {
    const gameId = request.params.id;

    try {
        // Fetch detailed game data from the BoardGameGeek API
        const gameData = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${gameId}`);
        if (!gameData) {
            return sendErrorResponse(response, 404, "Game not found", ["The specified game does not exist"]);
        }

        sendSuccessResponse(response, 200, "Game retrieved successfully", { game: gameData });
    } catch (error) {
        next(error);
    }
}); 

// CATCH-ALL //

module.exports = router;