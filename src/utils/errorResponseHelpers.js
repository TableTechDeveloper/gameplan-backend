// Function to handle errors that occur during Axios HTTP requests
function handleAxiosError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code outside of the range of 2xx
        console.error("Response error:", error.response.data);
        console.error("Status code:", error.response.status);
        console.error("Headers:", error.response.headers);
    } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
    } else {
        console.error("Error in setting up request:", error.message);
    }
    console.error("Config:", error.config);
}

// Middleware to handle general errors in the application
function errorHandler(error, request, response, next) {
    console.error(error.stack);
    response.status(500).json({
        status: 500,
        message: "Internal Server Error",
        errors: [error.message]
    });
}

// Function to send an error response with a given status, message, and errors
function sendErrorResponse(response, status, message, errors) {
    response.status(status).json({
        status: status,
        message: message,
        errors: errors
    });
}

// Function to send a success response with a given status, message, and data
function sendSuccessResponse(response, status, message, data) {
    response.status(status).json({
        status: status,
        message: message,
        ...data
    });
}

module.exports = {
    handleAxiosError,
    errorHandler,
    sendErrorResponse,
    sendSuccessResponse
};