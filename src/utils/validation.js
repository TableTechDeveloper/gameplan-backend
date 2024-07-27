// Function to handle validation errors that occur during user input validation
function handleValidationError(error, response) {
    // Check if the error is a validation error
    if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(val => val.message);
        // Send a 400 Bad Request response with the validation error messages
        return response.status(400).json({
            error: "Validation failed",
            messages: messages
        });
    } 
    // Check if the error is a duplicate key error (e.g., duplicate email or username)
    else if (error.code === 11000) {
        // Send a 400 Bad Request response with a duplicate key error message
        return response.status(400).json({
            error: "Duplicate key error",
            message: "This email address or username is already in use!"
        });
    } 
    // Handle other types of errors
    else {
        // Log the error to the console for debugging
        console.error("Error:", error);
        // Send a 500 Internal Server Error response with the error message
        return response.status(500).json({
            error: "Error",
            message: error.message
        });
    }
}

// Export the function to make it available for import in other files
module.exports = {
    handleValidationError
};