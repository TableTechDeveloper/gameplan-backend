const express = require("express");
const { Event } = require("../models/models");
const router = express.Router();

// Route to GET and display all PUBLIC and PUBLISHED events
router.get("/", async (request, response, next) => {
    try {
        let foundEvents = await Event.find({isPublic: true, isPublished: true}).exec();
        response.status(200).json(foundEvents);
    } catch (error) {
        response.status(500).json({
            status: 500,
            message: "Error retrieving events",
            errors: [error.message]
        });
    }
});

// Route to GET and display event when given id
router.get("/:id", async (request, response, next) => {
    try {
        let result = await Event.findById(request.params.id).exec();
        if (!result) {
            return response.status(404).json({
                status: 404,
                message: "Event not found",
                errors: ["This event does not exist"]
            });
        }
        response.json(result);
    } catch (error) {
        response.status(500).json({
            status: 500,
            message: "Error retrieving event",
            errors: [error.message]
        });
    }
});



module.exports = router;