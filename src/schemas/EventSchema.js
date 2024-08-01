const mongoose = require("mongoose")

// DRY function to determine if a game is published or draft.
// This will determin if a field is mandatory (published), or optional (draft)
const isPublished = function () {
    return this.isPublished
}
const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: false
    },
    host: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
        unique: false
    },
    participants:[{
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
        unique: false
    }],
    eventDate: {
        type: Date,
        required: isPublished,
        unique: false
    },
    game: {
        type: mongoose.Types.ObjectId,
        ref: "Game",
        unique: false,
        required: true
    },
    location: {
        type: String,
        unique: false,
        required: isPublished
    },
    gameImage: {
        type: String,
        unique: false,
        required: true
    },
    gameThumbnail: {
        type: String,
        unique: false,
        required: true
    },
    minParticipants: {
        type: Number,
        unique: false,
        required: isPublished
    },
    maxParticipants: {
        type: Number,
        required: isPublished,
        unique: false
    },
    gamelength: {
        type: Number,
        required: isPublished,
        unique: false
    },
    isPublished: {
        type: Boolean,
        default: false,
        required: true
    },
    isPublic: {
        required: isPublished,
        unique: false,
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
})


module.exports = EventSchema