const express = require('express');
const router = express.Router();
const { User } = require('../models/models');
const { createJWT } = require('../utils/authHelpers');

router.post('/register', async (request, response) => {
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
            response.status(400).json({
                error: 'Validation failed',
                messages: messages
            });
        } else if (error.code === 11000) {
            // Handle duplicate key errors (e.g., unique email)
            response.status(400).json({
                error: 'Duplicate key error',
                message: 'This email address or username is already in use!'
            });
        } else {
            response.status(500).json({
                error: 'Error registering new user'
            });
        }
    }
});

module.exports = router;