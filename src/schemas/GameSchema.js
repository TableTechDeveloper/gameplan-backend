const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    boardgamegeekref: {
        type: Number,
        required: true,
        unique: true
    },
    yearpublished: {
        type: String,
        required: true
    },
    minplayers: {
        type: Number,
        required: true
    },
    maxplayers: {
        type: Number,
        required: true
    },
    playtime: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    }
});

module.exports = GameSchema;