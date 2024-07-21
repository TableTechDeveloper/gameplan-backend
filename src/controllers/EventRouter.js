const express = require('express');
const { Event } = require('../models/models');
const router = express.Router();

// Route to GET and display all events
router.get('/', async (request, response, next) => {
    try {
        let foundEvents = await Event.find({}).exec()
        response.status(200).json(foundEvents)
    } catch (error) {
        next({
            status: 500,
            message: 'Error retrieving events',
            errors: [error.message]
        })
    }
})

module.exports = router