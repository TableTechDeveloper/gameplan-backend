const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { jwtKey } = require('../config/config');

// Function to confirm if a password input by user matches the hashed password stored in database
async function checkPassword(plaintextPassword, encryptedPassword) {
    let doPasswordsMatch = false
    doPasswordsMatch = await bcrypt.compare(plaintextPassword, encryptedPassword);
    return doPasswordsMatch
}

// Function to generate a JWT for a user
function createJWT(userId) {
    let newJwt = jwt.sign(
        {id: userId}, 
        jwtKey,
        {
            expiresIn: "7d"
        }
    );
    return newJwt
}

// Function to check a given JWT is valid
function validateJwt(jwtToValidate) {
    let isJwtValid = false;
    jwt.verify(jwtToValidate, jwtKey, (error, decodedJwt) => {
        if (error) {
            throw new Error("User JWT is not valid!");
        }
        console.log("Decoded JWT data:");
        console.log(decodedJwt);
        isJwtValid = true
    });
    return isJwtValid
}

// Funtion to verify a JWT 
function decodeJwt(jwtToDecode) {
    let decodedData = jwt.verify(jwtToDecode, jwtKey)
    return decodedData
}

module.exports = {
    checkPassword,
    createJWT,
    validateJwt,
    decodeJwt
}