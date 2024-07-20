const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { jwtKey } = require('../config/config');


async function checkPassword(plaintextPassword, encryptedPassword) {
    let doPasswordsMatch = false

    doPasswordsMatch = await bcrypt.compare(plaintextPassword, encryptedPassword);
    return doPasswordsMatch
}

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