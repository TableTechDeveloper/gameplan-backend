const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtKey } = require("../config/config");

// Function to confirm if a password input by the user matches the hashed password stored in the database
async function checkPassword(plaintextPassword, encryptedPassword) {
    let doPasswordsMatch = false;
    // Compare the plaintext password with the hashed password
    doPasswordsMatch = await bcrypt.compare(plaintextPassword, encryptedPassword);
    return doPasswordsMatch;
}

// Function to generate a JWT for a user
function createJWT(userId) {
    // Create a new JWT, setting the user ID as the payload and signing it with the JWT key
    let newJwt = jwt.sign(
        { id: userId },
        jwtKey,
        {
            expiresIn: "7d"
        }
    );
    return newJwt;
}

// Function to check if a given JWT is valid
function validateJwt(jwtToValidate) {
    let isJwtValid = false;
    // Verify the JWT using the JWT key
    jwt.verify(jwtToValidate, jwtKey, (error, decodedJwt) => {
        if (error) {
            throw new Error("User JWT is not valid!");
        }
        console.log("Decoded JWT data:");
        console.log(decodedJwt);
        isJwtValid = true;
    });
    return isJwtValid;
}

// Function to decode a JWT and extract its payload
function decodeJwt(jwtToDecode) {
    // Decode the JWT using the JWT key
    let decodedData = jwt.verify(jwtToDecode, jwtKey);
    return decodedData;
}

// Authenticate a JWT and extract the user ID
function authenticateJWT(request, response, next) {
    // Get the token from the request header
    const token = request.header("Authorization");

    // If no token is provided, return access denied response
    if (!token) {
        return response.status(401).json({
            status: 401,
            message: "Access Denied. User not logged in"
        });
    }
    try {
        // Verify the token and extract the decoded data
        const decoded = jwt.verify(token, jwtKey);
        // Attach the decoded user data to the request object
        request.user = decoded;
        next();
    } catch (error) {
        // If the token is invalid, return an error response
        response.status(400).json({
            status: 400,
            message: "Invalid token"
        });
    }
}

module.exports = {
    checkPassword,
    createJWT,
    validateJwt,
    decodeJwt,
    authenticateJWT
};