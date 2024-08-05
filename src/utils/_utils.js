const { checkPassword, createJWT, authenticateJWT } = require('./authHelpers');
const { fetchBoardGameData, searchForSingleGame, searchForMultipleGames } = require('./boardgamegeekApi');
const { databaseConnector, databaseDisconnector, databaseClear, seedGames, seedUsers, seedEvents, seed } = require('./database');
const { handleAxiosError, errorHandler, sendErrorResponse, sendSuccessResponse } = require('./errorResponseHelpers');
// const sendPasswordResetEmail = require('./passwordReset');
const { handleValidationError, validatePassword } = require('./validation');

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
    handleValidationError,
    validatePassword
};