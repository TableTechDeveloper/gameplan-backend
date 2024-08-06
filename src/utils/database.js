const mongoose = require("mongoose");
const { fetchBoardGameData } = require("./boardgamegeekApi");
const { Game, User, Event } = require("../models/models");
const { databaseURL } = require("../config/config");

// Function to connect to the database
async function databaseConnector(databaseURL) {
    await mongoose.connect(databaseURL);
    console.log("Database connection completed");
}

// Function to disconnect from the database
async function databaseDisconnector() {
    await mongoose.connection.close();
    console.log("Database disconnected");
}

// Function to clear the database
async function databaseClear() {
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped");
}

// Function to seed the database with board game data
async function seedGames() {
    const gameIDs = [];
    // List of BoardGameGeek IDs for the games to seed
    const seedIDs = [234931, 149296, 15045, 151347, 150376]

    try {
        // Loop through each BoardGameGeek ID to fetch and insert game data
        for (const id of seedIDs) {
            const url = `https://boardgamegeek.com/xmlapi/boardgame/${id}`;
            const gameData = await fetchBoardGameData(url);
            if (gameData) {
                // Create a new game document in the database
                const newGame = await Game.create(gameData);
                gameIDs.push(newGame._id);
                console.log(`Inserted game data for ID: ${id}`);
            } else {
                console.log(`Failed to insert game data for ID: ${id}`);
            }
        }
        console.log("Seeding completed");
    } catch (error) {
        console.error("Error seeding games: ", error);
    }
    return gameIDs;
}

// Function to seed the database with user data
async function seedUsers(gameIDs) {
    let userData = [
        {
            email: "test@example.com",
            password: "Test@1234",
            username: "Test1234",
            location: "123 Fake Street, Geelong, VIC, 3220, AUS",
            gamesOwned: gameIDs,
            securityQuestionOne: "blue",
            securityQuestionTwo: "car",
            securityQuestionThree: "bird"
        }
    ];

    try {
        // Loop through each user data object to create new user documents in the database
        let result = await Promise.all(userData.map(async (user) => {
            let newUser = await User.create(user);
            return newUser;
        }));
        console.log(result);
        return result.map(user => user._id);
    } catch (error) {
        console.error("Error seeding users: ", error);
    }
}

// Function to seed the database with event data
async function seedEvents(gameIDs, userIDs) {
    try {
        if (gameIDs.length === 0 || userIDs.length === 0) {
            throw new Error("No game IDs or user IDs available for seeding events.");
        }

        // Create the first event
        const game1 = await Game.findById(gameIDs[0]);
        const host1 = await User.findById(userIDs[0]);

        const newEvent1 = await Event.create({
            title: "Sample Event",
            host: host1._id,
            participants: [host1._id],
            eventDate: new Date(),
            game: game1._id,
            location: host1.location,
            gameImage: game1.image,
            gameThumbnail: game1.thumbnail,
            minParticipants: game1.minplayers,
            maxParticipants: game1.maxplayers,
            gamelength: game1.playtime,
            isPublished: true,
            isPublic: true
        });

        console.log(`Inserted event data with ID: ${newEvent1._id}`);

        // Create the second event
        const game2 = await Game.findById(gameIDs[1]);
        const host2 = await User.findById(userIDs[0]);

        const newEvent2 = await Event.create({
            title: "Private Game Night",
            host: host2._id,
            participants: [host2._id],
            eventDate: new Date(),
            game: game2._id,
            location: host2.location,
            gameImage: game2.image,
            gameThumbnail: game2.thumbnail,
            minParticipants: game2.minplayers,
            maxParticipants: game2.maxplayers,
            gamelength: game2.playtime,
            isPublished: true,
            isPublic: false
        });

        console.log(`Inserted event data with ID: ${newEvent2._id}`);
    } catch (error) {
        console.error("Error seeding events: ", error);
    }
}

// Main function to seed the database
async function seed() {
    await databaseConnector(databaseURL);
    await databaseClear();

    // Seed games, users, and events, and obtain their IDs
    let gameIDs = await seedGames();
    let userIDs = await seedUsers(gameIDs);
    await seedEvents(gameIDs, userIDs);

    console.log("Seeded the data!");
    await databaseDisconnector();
}

module.exports = {
    databaseConnector,
    databaseDisconnector,
    databaseClear,
    seedGames,
    seedUsers,
    seedEvents,
    seed
};