const express = require("express");
const router = express.Router();
const { Event, User, Game } = require("../models/models");
const { authenticateJWT } = require("../utils/authHelpers");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseHelpers");

// STATIC ROUTES

// ROUTES WITH PARAMETERS

/**
 * Route to POST (create) a new event.
 * Requires authentication.
 */
router.post("/new", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const { title, eventDate, game, location, minParticipants, maxParticipants, gamelength, isPublic, isPublished } = request.body;
        
        const user = await User.findById(userId).exec();
        if (!user.gamesOwned.includes(game)) {
            return sendErrorResponse(response, 400, "Game not owned", ["You can only host events with games you own"]);
        }

        const gameDetails = await Game.findById(game).exec();
        if (!gameDetails) {
            return sendErrorResponse(response, 400, "Game not found", ["The specified game does not exist"]);
        }

        if (isPublished && (!title || !eventDate || !location || !maxParticipants || !gamelength)) {
            return sendErrorResponse(response, 400, "Missing required fields for published event", ["Title, event date, location, max participants, and game length are required when publishing an event"]);
        }

        const newEvent = new Event({
            title,
            host: userId,
            participants: [userId],
            eventDate,
            game,
            location,
            gameImage: gameDetails.image,
            gameThumbnail: gameDetails.thumbnail,
            minParticipants: minParticipants || gameDetails.minplayers,
            maxParticipants: maxParticipants || gameDetails.maxplayers,
            gamelength: gamelength || gameDetails.playtime,
            isPublic: isPublished ? isPublic : false,
            isPublished
        });

        await newEvent.save();

        user.eventsAttending.push(newEvent._id);
        await user.save();

        sendSuccessResponse(response, 201, "Event created successfully", { newEvent });
    } catch (error) {
        next(error);
    }
}); // TESTED

/**
 * Route to POST a user registering their attendance to an event.
 * Requires authentication.
 */
router.post("/:id/register", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;

        const event = await Event.findById(eventId).exec();
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }

        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["This user does not exist"]);
        }

        if (event.participants.includes(userId)) {
            return sendErrorResponse(response, 400, "User already registered for this event", ["You are already registered for this event"]);
        }

        if (event.participants.length >= event.maxParticipants) {
            return sendErrorResponse(response, 400, "This event is full", ["Sorry, this event is currently full, please find another event or try again later."]);
        }

        event.participants.push(userId);
        user.eventsAttending.push(eventId);

        await event.save();
        await user.save();

        sendSuccessResponse(response, 200, `User has successfully registered for the ${event.title} event`, { event, user });
    } catch (error) {
        next(error);
    }
}); // TESTED

/**
 * Route to GET and display an event when given an ID.
 */
router.get("/:id", async (request, response, next) => {
    try {
        const result = await Event.findById(request.params.id).populate("host", "username").populate("participants", "username").exec();
        if (!result) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        sendSuccessResponse(response, 200, "Event retrieved successfully", { result });
    } catch (error) {
        next(error);
    }
}); // TESTED

/**
 * Route to PATCH (edit) an event.
 * Requires authentication.
 */
router.patch("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;
        const event = await Event.findById(eventId).exec();
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        if (event.host.toString() !== userId) {
            return sendErrorResponse(response, 403, "Only the host may perform this action", ["You are not permitted to edit this event"]);
        }

        const updatedEventDetails = request.body;

        // Check for required fields if the event is being published
        if (updatedEventDetails.isPublished && !event.isPublished) {
            const { title, eventDate, location, maxParticipants, gamelength } = updatedEventDetails;

            // Check if any of the required fields are missing in the request body
            if (!title && !event.title) {
                return sendErrorResponse(response, 400, "Missing required fields for published event", ["Title is required when publishing an event"]);
            }
            if (!eventDate) {
                return sendErrorResponse(response, 400, "Missing required fields for published event", ["Event date is required when publishing an event"]);
            }
            if (!location && !event.location) {
                return sendErrorResponse(response, 400, "Missing required fields for published event", ["Location is required when publishing an event"]);
            }
            if (!maxParticipants && !event.maxParticipants) {
                return sendErrorResponse(response, 400, "Missing required fields for published event", ["Max participants is required when publishing an event"]);
            }
            if (!gamelength && !event.gamelength) {
                return sendErrorResponse(response, 400, "Missing required fields for published event", ["Game length is required when publishing an event"]);
            }
        }

        Object.assign(event, updatedEventDetails);
        // Fetch the game details and update the gameImage and gameThumbnail
        const gameDetails = await Game.findById(event.game).exec();
        if (gameDetails) {
            event.gameImage = gameDetails.image;
            event.gameThumbnail = gameDetails.thumbnail
        }
        
        await event.save();

        sendSuccessResponse(response, 200, "Event updated successfully", { event });
    } catch (error) {
        next(error);
    }
}); // TESTED

/**
 * Route to DELETE an event.
 * Requires authentication.
 */
router.delete("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;
        const event = await Event.findById(eventId).exec();
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        if (event.host.toString() !== userId) {
            return sendErrorResponse(response, 404, "Only the host may perform this action", ["You are not permitted to delete this event"]);
        }

        await User.updateMany({ _id: { $in: event.participants } }, { $pull: { eventsAttending: eventId } });
        await Event.findByIdAndDelete(eventId);

        sendSuccessResponse(response, 200, "Event deleted successfully", {});
    } catch (error) {
        next(error);
    }
}); // TESTED

// CATCH-ALL

/**
 * Route to GET and display all PUBLIC and PUBLISHED events.
 */
router.get("/", async (request, response, next) => {
    try {
        const foundEvents = await Event.find({ isPublic: true, isPublished: true }).exec();
        sendSuccessResponse(response, 200, "Events retrieved successfully", { foundEvents });
    } catch (error) {
        next(error);
    }
}); // TESTED

module.exports = router;