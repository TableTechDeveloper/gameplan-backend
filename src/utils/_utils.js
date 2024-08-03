// Re-export functions from authHelpers.js
const { checkPassword, createJWT, authenticateJWT } = require('./authHelpers');

// Re-export functions from boardgamegeekApi.js
const { fetchBoardGameData, searchForSingleGame, searchForMultipleGames } = require('./boardgamegeekApi');

// Re-export functions from database.js
const { databaseConnector, databaseDisconnector, databaseClear, seedGames, seedUsers, seedEvents, seed } = require('./database');

// Re-export functions from errorResponseHelpers.js
const { handleAxiosError, errorHandler, sendErrorResponse, sendSuccessResponse } = require('./errorResponseHelpers');

// Re-export function from passwordReset.js
const sendPasswordResetEmail = require('./passwordReset');

// Re-export functions from validation.js
const { handleValidationError, validatePassword } = require('./validation');

// Export all re-exported functions together
module.exports = {
    checkPassword,
    createJWT,
    authenticateJWT,
    fetchBoardGameData,
    searchForSingleGame,
    searchForMultipleGames,
    databaseConnector,
    databaseDisconnector,
    databaseClear,
    seedGames,
    seedUsers,
    seedEvents,
    seed,
    handleAxiosError,
    errorHandler,
    sendErrorResponse,
    sendSuccessResponse,
    sendPasswordResetEmail,
    handleValidationError,
    validatePassword
};