const { fetchBoardGameData } = require("./boardgamegeekApiParse");
const { Game, User, Event } = require("../models/models");
const { databaseConnector, databaseDisconnector, databaseClear } = require("./database");
const { databaseURL } = require("../config/config");

async function seedGames() {
    const gameIDs = [];
    const seedIDs = [234931, 149296, 15045, 151347, 150376, 164153, 124742, 175324, 185104, 18901, 233078, 141430, 163745, 1931, 2452, 1917, 320, 4864, 1294, 15046, 71921, 312267, 296912, 192291, 128882, 54043, 343629, 50381, 62871, 140934, 2223, 179172, 244500, 341772, 110327, 338521, 280986, 1927, 181304, 237182, 161970, 39856, 160069, 124172];

    try {
        for (const id of seedIDs) {
            const url = `https://boardgamegeek.com/xmlapi/boardgame/${id}`;
            const gameData = await fetchBoardGameData(url);
            if (gameData) {
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

async function seedUsers(gameIDs) {
    let userData = [
        {
            email: "dilloncotter@gmail.com",
            password: "Execute@rder66",
            username: "Dilbot-Cot",
            location: "123 Fake Street, Geelong, VIC, 3220, AUS",
            gamesOwned: gameIDs // Pass the gameIDs to the user
        }
    ];
    let result = await Promise.all(userData.map(async (user) => {
        let newUser = await User.create(user);
        return newUser;
    }));
    console.log(result);
    return result;
}

async function seedEvents(gameIDs, userIDs) {
    try {
        // First Event
        const game1 = await Game.findById(gameIDs[0]);
        const host1 = await User.findById(userIDs[0]);

        const newEvent1 = await Event.create({
            title: "Sample Event",
            host: host1._id,
            participants: [],
            eventDate: new Date(),
            game: game1._id,
            location: host1.location,
            minParticipants: game1.minplayers,
            maxParticipants: game1.maxplayers,
            gamelength: game1.playtime,
            isPublished: true,
            isPublic: true
        });

        console.log(`Inserted event data with ID: ${newEvent1._id}`);

        // Second Event
        const game2 = await Game.findById(gameIDs[1]);
        const host2 = await User.findById(userIDs[0]);

        const newEvent2 = await Event.create({
            title: "Private Game Night",
            host: host2._id,
            participants: [],
            eventDate: new Date(),
            game: game2._id,
            location: host2.location,
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

async function seed() {
    await databaseConnector(databaseURL);
    await databaseClear();

    let gameIDs = await seedGames(); // Get the game IDs from seeding games
    let userIDs = await seedUsers(gameIDs); // Pass the game IDs to seedUsers
    await seedEvents(gameIDs, userIDs); // Pass game and user IDs to seedEvents

    console.log("Seeded the data!");
    await databaseDisconnector(); // Corrected function call
}

seed();