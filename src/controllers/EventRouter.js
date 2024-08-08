const express = require("express");
const router = express.Router();
const { Event, User, Game } = require("../models/models");
const { authenticateJWT, sendErrorResponse, sendSuccessResponse } = require("../utils/_utils");

// STATIC ROUTES //

// ROUTES WITH PARAMETERS//

/**
 * Route to POST (create) a new event.
 * Requires authentication.
 */
router.post("/new", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const { 
            title, 
            eventDate, 
            game, 
            location, 
            minParticipants, 
            maxParticipants, 
            gamelength, 
            isPublic, 
            isPublished 
        } = request.body;

        const user = await User.findById(userId).exec();
        // User can only add game to event if they own it first
        if (!user.gamesOwned.includes(game)) {
            return sendErrorResponse(response, 400, "Game not owned", ["You can only host events with games you own"]);
        }
        // Find game in db
        const gameDetails = await Game.findById(game).exec();
        if (!gameDetails) {
            return sendErrorResponse(response, 400, "Game not found", ["The specified game does not exist"]);
        }
        // if the event is published, then ensure the title, eventDate and location have been captured
        if (isPublished && (!title || !eventDate || !location)) {
            return sendErrorResponse(response, 400, "Missing required fields for published event", ["Title, event date, location, min participants, max participants, and game length are required when publishing an event"]);
        }

        // create the event
        const newEvent = new Event({
            title,
            host: userId,
            participants: [userId],
            eventDate,
            game,
            location,
            gameImage: gameDetails.image, // gameImage will always populate from the game
            gameThumbnail: gameDetails.thumbnail, // gameThumbnail will always populate from the game
            minParticipants: minParticipants || gameDetails.minplayers, // minParticipants can be declared, or will default from the game info
            maxParticipants: maxParticipants || gameDetails.maxplayers, // maxParticipants can be declared, or will default from the game info
            gamelength: gamelength || gameDetails.playtime, // gameLength can be declared, or will default from the game info
            isPublic: isPublished ? isPublic : false,
            isPublished
        });
        // save the event to db
        await newEvent.save();
        // add the event to the host's "eventsAttending" list
        user.eventsAttending.push(newEvent._id);
        await user.save();

        sendSuccessResponse(response, 201, "Event created successfully", { newEvent });
    } catch (error) {
        next(error);
    }
}); 

/**
 * Route to POST a user registering their attendance to an event.
 * Requires authentication.
 */
router.post("/:id/register", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;

        // check that the event is in db
        const event = await Event.findById(eventId).exec();
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }

        // check that user is in db
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["This user does not exist"]);
        }

        // check is user is already a participant (NOTE: host is also a participant)
        if (event.participants.includes(userId)) {
            return sendErrorResponse(response, 400, "User already registered for this event", ["You are already registered for this event"]);
        }

        // check that the number of participants is less than the max participants
        if (event.participants.length >= event.maxParticipants) {
            return sendErrorResponse(response, 400, "This event is full", ["Sorry, this event is currently full, please find another event or try again later."]);
        }

        if (event.isPublished == false) {
            return sendErrorResponse(response, 400, "This event is not ready yet!", ["Sorry, this event is not yet published. Please reach out to the event organiser to request this be updated"]);
        }

        // add the user to the event
        event.participants.push(userId);
        // add the event to the user
        user.eventsAttending.push(eventId);

        await event.save();
        await user.save();

        sendSuccessResponse(response, 200, `User has successfully registered for the ${event.title} event`, { event, user });
    } catch (error) {
        next(error);
    }
}); 

/**
 * Route to GET and display an event when given an ID.
 */
router.get("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        // check that user is in db
        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["This user does not exist"]);
        }

        // get the event that matches the id in the url 
        const result = await Event.findById(request.params.id)
        .populate("host", "username") // add the username of the host along with the id
        .populate("participants", "username") // add the username(s) of the participants along with the id
        .exec();

        // check if the event exists
        if (!result) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        sendSuccessResponse(response, 200, "Event retrieved successfully", { result });
    } catch (error) {
        next(error);
    }
}); 

/**
 * Route to PATCH (edit) an event.
 * Requires authentication.
 */
router.patch("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;
        // get the event that matches the id in the url 
        const event = await Event.findById(eventId).exec();
        // check that event is in db
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        // check if the logged in user is the host
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
}); 

/**
 * Route to DELETE a user attending an event they are participating in.
 * Requires authentication
 */
router.delete("/:id/leave", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;

        const user = await User.findById(userId).exec();
        if (!user) {
            return sendErrorResponse(response, 404, "User not found", ["The user is not found or not logged in"]);
        }
        const event = await Event.findById(eventId).exec();
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["The event is not found"]);
        }

        // Check if the user is attending the event
        if (!user.eventsAttending.includes(eventId)) {
            return sendErrorResponse(response, 400, "User not going to the event", ["You are not listed as attending this event!"]);
        }

        if (event.host.equals(user._id)) {
            return sendErrorResponse(response, 418, "You are the host! You cannot leave!", ["The host is not permitted to leave the event"]) // This is an easter egg code response, Hi Alex!
        }

        // Remove the event from the user's attending list
        user.eventsAttending.pull(eventId);
        await user.save();

        // Remove the user from the event participants
        if (!event.participants.includes(userId)) {
            return sendErrorResponse(response, 400, "User not going to the event", ["You are not listed as attending this event!"]);
        }

        event.participants.pull(userId);
        await event.save();

        sendSuccessResponse(response, 200, `You have successfully left the ${event.title} event`);
    } catch (error) {
        next(error);
    }
});

/**
 * Route to DELETE an event.
 * Requires authentication.
 */
router.delete("/:id", authenticateJWT, async (request, response, next) => {
    try {
        const userId = request.user.id;
        const eventId = request.params.id;
        const event = await Event.findById(eventId).exec();
        // check that event is in db
        if (!event) {
            return sendErrorResponse(response, 404, "Event not found", ["This event does not exist"]);
        }
        // check if the logged in user is the host
        if (event.host.toString() !== userId) {
            return sendErrorResponse(response, 403, "Only the host may perform this action", ["You are not permitted to delete this event"]);
        }
        // remove the event from each user in db
        await User.updateMany({ _id: { $in: event.participants } }, { $pull: { eventsAttending: eventId } });
        // remove event from db
        await Event.findByIdAndDelete(eventId);

        sendSuccessResponse(response, 200, "Event deleted successfully", {});
    } catch (error) {
        next(error);
    }
}); 

// CATCH-ALL

/**
 * Route to GET and display all PUBLIC and PUBLISHED events.
 */
router.get("/", async (request, response, next) => {
    try {
        const foundEvents = await Event.find({ isPublic: true, isPublished: true })
        .populate("host", "username") // add the username of the host along with the id
        .populate("participants", "username") // add the username(s) of the participants along with the id
        .sort({ eventDate: 1 }) // Sort events by event date in ascending order
        .exec();
        sendSuccessResponse(response, 200, "Events retrieved successfully", { foundEvents });
    } catch (error) {
        next(error);
    }
});

module.exports = router;