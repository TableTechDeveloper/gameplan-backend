function sendErrorResponse(response, status, message, errors) {
    response.status(status).json({
        status: status,
        message: message,
        errors: errors
    });
}

function sendSuccessResponse(response, status, message, data) {
    response.status(status).json({
        status: status,
        message: message,
        ...data
    });
}

module.exports = {
    sendErrorResponse,
    sendSuccessResponse
};