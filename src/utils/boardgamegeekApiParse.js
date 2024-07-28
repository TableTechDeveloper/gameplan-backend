const axios = require("axios");
const xml2js = require("xml2js");
const { handleAxiosError } = require("./errorHandler");

// Function to fetch board game data from the BoardGameGeek API given a URL
async function fetchBoardGameData(url) {
    try {
        const response = await axios.get(url);
        const parsedData = await xml2js.parseStringPromise(response.data);
        const boardgameContent = parsedData.boardgames.boardgame[0];

        let boardgameName = "";
        // Loop through the name elements to find the primary name
        for (const name of boardgameContent.name) {
            if (name.$.primary === "true") {
                boardgameName = name._;
                break;
            }
        }
        // Extract other relevant information from the board game content
        const boardgameDescription = boardgameContent.description[0];
        const boardgameGeekRef = boardgameContent.$.objectid;
        const yearPublished = boardgameContent.yearpublished[0];
        const minPlayers = parseInt(boardgameContent.minplayers[0], 10);
        const maxPlayers = parseInt(boardgameContent.maxplayers[0], 10);
        const playTime = parseInt(boardgameContent.playingtime[0], 10);
        const thumbnail = boardgameContent.thumbnail[0];
        const image = boardgameContent.image[0];

        // Return an object containing the extracted board game information
        return {
            name: boardgameName,
            boardgamegeekref: boardgameGeekRef,
            yearpublished: yearPublished,
            minplayers: minPlayers,
            maxplayers: maxPlayers,
            playtime: playTime,
            description: boardgameDescription,
            thumbnail: thumbnail,
            image: image
        };

    } catch (error) {
        handleAxiosError(error);
        return null;
    }
}

// Function to search for a game by name and retrieve its object ID from the BoardGameGeek API
async function searchForSingleGame(name) {
    try {
        // Make an HTTP GET request to search for the game by name with exact matching
        const response = await axios.get("https://boardgamegeek.com/xmlapi/search?search=" + name + "&exact=1");
        const parsedData = await xml2js.parseStringPromise(response.data);
        const boardgamedata = parsedData.boardgames.boardgame[0];
        // Extract and log the object ID of the board game
        const id = boardgamedata.$.objectid;

        // Fetch and return the game data
        const gameData = await fetchBoardGameData(`https://boardgamegeek.com/xmlapi/boardgame/${id}`);
        return gameData;
    } catch (error) {
        handleAxiosError(error);
        return null;
    }
}

// Function to search for multiple games by name and retrieve their object IDs from the BoardGameGeek API
async function searchForMultipleGames(name) {
    try {
        // Make an HTTP GET request to search for games by name
        const response = await axios.get(`https://boardgamegeek.com/xmlapi/search?search=${name}`);
        const parsedData = await xml2js.parseStringPromise(response.data);
        const boardgameResults = parsedData.boardgames.boardgame;

        // Return minimal data for each result
        // Originally had the same function to output all the game data for each result, however when used for games such as Monopoly, as there are huge numbers of games matching the description the promise would take over 5 minutes to perform.
        // Instead implementing a secondary route to get more game information in the GameRouter
        const gameData = boardgameResults.map(game => ({
            id: game.$.objectid,
            name: game.name[0]._,
            yearpublished: game.yearpublished[0]
        }));

        return gameData;
    } catch (error) {
        handleAxiosError(error);
        return null;
    }
}

module.exports = {
    fetchBoardGameData,
    searchForSingleGame,
    searchForMultipleGames
};