const { databaseConnector, seedGames, seedUsers, seedEvents, databaseClear, databaseDisconnector } = require("./_utils")
const { databaseURL } = require("../config/config");

async function seed() {
  try {
    // Connect to the database
    console.log(`Connecting to database at ${databaseURL}`)
    await databaseConnector(databaseURL);

    // Seed the data
    await databaseClear();
    let gameIDs = await seedGames();
    let userIDs = await seedUsers(gameIDs);
    await seedEvents(gameIDs, userIDs);

    console.log("Data seeding completed successfully");

    // Disconnect from the database
    await databaseDisconnector();
  } catch (error) {
    console.error("Error during data seeding:", error);
  }
}

seed();