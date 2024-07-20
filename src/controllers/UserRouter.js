const express = require('express');
const router = express.Router();
const { User } = require('../models/models');
const { createJWT, checkPassword } = require('../utils/authHelpers');

router.post('/register', async (request, response, next) => {
    const { email, password, username, location } = request.body;

    const newUser = new User({
        email,
        password,
        username,
        location
    });

    try {
        await newUser.save();
        const token = createJWT(newUser._id);
        response.status(201).json({ token, user: newUser });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next({
                status: 400,
                message: 'Validation failed',
                errors: messages
            });
        } else if (error.code === 11000) {
            return next({
                status: 400,
                message: 'Duplicate key error',
                errors: ['This email address or username is already in use!']
            });
        } else {
            return next({
                status: 500,
                message: 'Error registering new user'
            });
        }
    }
});

router.post('/login', async (request, response, next) => {
    if (!request.body.password || !request.body.username) {
        return next({
            status: 400,
            message: 'Missing login details'
        });
    }

    try {
        let foundUser = await User.findOne({ username: request.body.username }).exec();

        if (!foundUser) {
            return next({
                status: 400,
                message: 'User not found'
            });
        }

        let isPasswordCorrect = await checkPassword(request.body.password, foundUser.password);
        if (isPasswordCorrect) {
            const newJwt = createJWT(foundUser._id);
            response.json({
                jwt: newJwt
            });
            console.log(`${foundUser.username} has logged in!`);
        } else {
            return next({
                status: 400,
                message: 'Incorrect password'
            });
        }
    } catch (error) {
        return next({
            status: 500,
            message: 'Error logging in'
        });
    }
});

module.exports = router;