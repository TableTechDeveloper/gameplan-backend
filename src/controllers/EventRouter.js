const express = require("express");
const router = express.Router();
const { Event, User, Game } = require("../models/models");
const { authenticateJWT } = require("../utils/authHelpers");

// Route to GET and display all PUBLIC and PUBLISHED events
router.get("/", async (request, response, next) => {
    try {
        // Find all events that are public and published
        const foundEvents = await Event.find({ isPublic: true, isPublished: true }).exec();
        response.status(200).json(foundEvents);
    } catch (error) {
        // Handle errors by sending a 500 Internal Server Error response
        response.status(500).json({
            status: 500,
            message: "Error retrieving events",
            errors: [error.message]
        });
    }
});

// Route to GET and display an event when given an ID
router.get("/:id", async (request, response, next) => {
    try {
        // Find the event by ID
        const result = await Event.findById(request.params.id).exec();
        // Check if the event was found
        if (!result) {
            // Send a 404 Not Found response if the event does not exist
            return response.status(404).json({
                status: 404,
                message: "Event not found",
                errors: ["This event does not exist"]
            });
        }
        response.json(result);
    } catch (error) {
        // Handle errors by sending a 500 Internal Server Error response
        response.status(500).json({
            status: 500,
            message: "Error retrieving event",
            errors: [error.message]
        });
    }
});

/**
 * Route to POST a user registering their attendance to an event.
 * Requires the user to be authenticated
 */
router.post("/:id/register", authenticateJWT, async (request, response, next) => {
    try {
        // Extract the user ID from the authenticated user's JWT
        const userId = request.user.id;
        // Extract the event ID from the request parameters
        const eventId = request.params.id;

        // Find the event by ID
        const event = await Event.findById(eventId).exec();
        // Check if the event exists
        if (!event) {
            return response.status(404).json({
                status: 404,
                message: "Event not found",
                errors: ["This event does not exist"]
            });
        }

        // Find the user by ID
        const user = await User.findById(userId).exec();
        // Check if the user exists
        if (!user) {
            return response.status(404).json({
                status: 404,
                message: "User not found",
                errors: ["This user does not exist"]
            });
        }

        // Check if the user is already registered for the event
        if (event.participants.includes(userId)) {
            return response.status(400).json({
                status: 400,
                message: "User already registered for this event",
                errors: ["You are already registered for this event"]
            });
        }

        // Check if the event is full
        if (event.participants.length >= event.maxParticipants) {
            return response.status(400).json({
                status: 400,
                message: "This event is full",
                errors: ["Sorry, this event is currently full, please find another event or try again later."]
            });
        }

        // Add the user ID to the event's participant list
        event.participants.push(userId);
        // Add the event ID to the user's eventsAttending list
        user.eventsAttending.push(eventId);

        // Save the updated event to the database
        await event.save();
        await user.save();

        // Send success response
        response.status(200).json({
            status: 200,
            message: `User has successfully registered for the ${event.title} event`,
            event: event,
            user: user
        });
    } catch (error) {
        console.error("Error registering for event:", error);
        response.status(500).json({
            status: 500,
            message: "Error registering for the event",
            errors: [error.message]
        });
    }
});

/**
 * Route to POST a new event.
 * Requires the user to be authenticated.
 */
router.post("/new", authenticateJWT, async (request, response, next) => {
    try {
        // Extract the user ID from the authenticated user's JWT
        const userId = request.user.id;

        // Extract event details from the request body
        const { title, eventDate, game, location, minParticipants, maxParticipants, gamelength, isPublic, isPublished } = request.body;

        // Validate the game ID and ownership
        const user = await User.findById(userId).exec();
        if (!user.gamesOwned.includes(game)) {
            return response.status(400).json({
                status: 400,
                message: "Game not owned",
                errors: ["You can only host events with games you own"]
            });
        }

        // Optionally fetch the game details (for validation or future use)
        const gameDetails = await Game.findById(game).exec();
        if (!gameDetails) {
            return response.status(400).json({
                status: 400,
                message: "Game not found",
                errors: ["The specified game does not exist"]
            });
        }

        // Check required fields if the event is published
        if (isPublished) {
            if (!title || !eventDate || !location || !maxParticipants || !gamelength) {
                return response.status(400).json({
                    status: 400,
                    message: "Missing required fields for published event",
                    errors: ["Title, event date, location, max participants, and game length are required when publishing an event"]
                });
            }
        }

        // Create a new event
        const newEvent = new Event({
            title,
            host: userId,
            participants: isPublished ? [userId] : [],
            eventDate,
            game,
            location,
            minParticipants: minParticipants || gameDetails.minplayers,
            maxParticipants: maxParticipants || gameDetails.maxplayers,
            gamelength: gamelength || gameDetails.playtime,
            isPublic: isPublished ? isPublic : false,
            isPublished
        });

        // Save the new event to the database
        await newEvent.save();

        // Update the user's hosted events if the event is published
        if (isPublished) {
            user.eventsAttending.push(newEvent._id);
            await user.save();
        }

        // Send success response
        response.status(201).json({
            status: 201,
            message: "Event created successfully",
            event: newEvent
        });
    } catch (error) {
        console.error("Error creating event:", error);
        response.status(500).json({
            status: 500,
            message: "Error creating event",
            errors: [error.message]
        });
    }
});

// Route to delete an event
router.delete("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;
        const event = await Event.findById(eventId).exec();
        // Check if the user is already registered for the event
        if (!event) {
            return response.status(404).json({
                status: 404,
                message: "Event not found",
                errors: ["This event does not exist"]
            })
        }
        if (event.host.toString() !== userId) {
            return response.status(404).json({
                status: 404,
                message: "Only the host may perform this action",
                errors: ["You are not permitted to delete this event"]
            });
        }
        // Remove the event from the participants eventsAttending lists
        await User.updateMany(
            { _id: { $in: event.participants } },
            { $pull: { eventsAttending: eventId } }
        );
        // Delete the event
        await Event.findByIdAndDelete(eventId);

        response.status(200).json({
            status: 200,
            message: "Event deleted successfully"
        })
    } catch (error) {
        console.error("Error deleting event: ", error);
        response.status(500).json({
            status: 500,
            message: "Error deleting event",
            errors: [error.message]
        })
    }
})

/**
 * Route to PATCH (edit) an event.
 * Requires the user to be authenticated and be the host of the event.
 */
router.patch("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;

        // Find the event by ID
        const event = await Event.findById(eventId).exec();

        // Check if the event exists
        if (!event) {
            return response.status(404).json({
                status: 404,
                message: "Event not found",
                errors: ["This event does not exist"]
            });
        }

        // Check if the requesting user is the host of the event
        if (event.host.toString() !== userId) {
            return response.status(403).json({
                status: 403,
                message: "Only the host may perform this action",
                errors: ["You are not permitted to edit this event"]
            });
        }

        // Update the event with new details from the request body
        const updatedEventDetails = request.body;

        // Ensure required fields are present if the event is being published
        if (updatedEventDetails.isPublished) {
            const { title, eventDate, location, maxParticipants, gamelength } = updatedEventDetails;
            if (!title || !eventDate || !location || !maxParticipants || !gamelength) {
                return response.status(400).json({
                    status: 400,
                    message: "Missing required fields for published event",
                    errors: ["Title, event date, location, max participants, and game length are required when publishing an event"]
                });
            }
        }

        // Merge the new details into the event document
        Object.assign(event, updatedEventDetails);

        // Save the updated event
        await event.save();

        // Send success response
        response.status(200).json({
            status: 200,
            message: "Event updated successfully",
            event: event
        });
    } catch (error) {
        console.error("Error updating event:", error);
        response.status(500).json({
            status: 500,
            message: "Error updating event",
            errors: [error.message]
        });
    }
});

module.exports = router;