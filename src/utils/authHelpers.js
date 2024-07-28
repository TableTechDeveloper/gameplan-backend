const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtKey } = require("../config/config");
const { User } = require("../models/models");

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

function authenticateJWT(request, response, next) {
    const authHeader = request.header("Authorization");

    if (!authHeader) {
        return response.status(401).json({
            status: 401,
            message: "Access Denied. No Authorization header provided"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return response.status(401).json({
            status: 401,
            message: "Access Denied. No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, jwtKey);
        request.user = decoded;
        next();
    } catch (error) {
        response.status(400).json({
            status: 400,
            message: "Invalid token"
        });
    }
}

module.exports = {
    checkPassword,
    createJWT,
    authenticateJWT
};