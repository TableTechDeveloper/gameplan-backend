const express = require('express');
const router = express.Router();
const { User } = require('../models/models');
const { createJWT, checkPassword } = require('../utils/authHelpers');

/**
 * Route to POST a new user registering.
 * Requires body to include email, password and username (optional) location
 */
router.post('/register', async (request, response, next) => {
    const { email, password, username, location } = request.body;

    const newUser = new User({
        email,
        password,
        username,
        location
    });

    // Attempts to create new user to database and returns 201 status and JWT token if successful
    try {
        
        await newUser.save();
        const token = createJWT(newUser._id);
        response.status(201).json({ token, user: newUser });
    } catch (error) {
        if (error.name === 'ValidationError') {
            // If the error is due to a validation error for not meeting model schema, return with the message provided in the schema
            const messages = Object.values(error.errors).map(val => val.message);
            response.status(400).json({
                error: 'Validation failed',
                messages: messages
            });
        } else if (error.code === 11000) {
            // Handle duplicate key errors if user attempts to register with an already in use email or username
            response.status(400).json({
                error: 'Duplicate key error',
                message: 'This email address or username is already in use!'
            });
        } else {
            // Provide server error if user still not created but not due to previous error catches
            response.status(500).json({
                error: 'Error registering new user'
            });
        }
    }
});

/**
 * Route to POST an exisiting user login
 * Requires username and password
 */
router.post('/login', async (request, response, next) => {
    let newJwt = "";
    // If body request is missing either the username or password return with an error
    if (!request.body.password || !request.body.username) {
        return next(
            new Error("Missing login details")
        )
    }

    // Find user in database by completing a search for the username
    let foundUser = await User.findOne({ username: request.body.username }).exec();

    // Perform the util function to check password provided matches the hashed password in database
    // return the JWT or an incorrect password message
    let isPasswordCorrect = checkPassword(request.body.password, foundUser.password);
    if (isPasswordCorrect) {
        newJwt = createJWT(foundUser._id);
        response.json({
            jwt: newJwt
        })
        console.log(`${foundUser.username} has logged in!`)
    } else {
        return next(
            new Error("Incorrect Password")
        )
    }

})

module.exports = router;