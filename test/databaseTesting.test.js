const mongoose = require("mongoose");
const {
  databaseConnector,
  databaseDisconnector,
  databaseClear,
  seedGames,
  seedUsers,
  seedEvents
} = require("../src/utils/database");

const { fetchBoardGameData } = require("../src/utils/boardgamegeekApi");
const { Game, User, Event } = require("../src/models/models");
const { databaseURL } = require("../src/config/config");

jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
    db: {
      dropDatabase: jest.fn(),
    },
  },
  model: jest.fn(),
}));

jest.mock("../src/utils/boardgamegeekApi", () => ({
  fetchBoardGameData: jest.fn(),
}));

jest.mock("../src/models/models", () => ({
  Game: {
    create: jest.fn(),
    findById: jest.fn(),
  },
  User: {
    create: jest.fn(),
    findById: jest.fn(),
  },
  Event: {
    create: jest.fn(),
  },
}));

describe("Database utility functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("databaseConnector", () => {
    it("should connect to the database", async () => {
      console.log = jest.fn();
      await databaseConnector(databaseURL);
      expect(mongoose.connect).toHaveBeenCalledWith(databaseURL);
      expect(console.log).toHaveBeenCalledWith("Database connection completed");
    });
  });

  describe("databaseDisconnector", () => {
    it("should disconnect from the database", async () => {
      console.log = jest.fn();
      await databaseDisconnector();
      expect(mongoose.connection.close).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("Database disconnected");
    });
  });

  describe("databaseClear", () => {
    it("should clear the database", async () => {
      console.log = jest.fn();
      await databaseClear();
      expect(mongoose.connection.db.dropDatabase).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("Database dropped");
    });
  });

  describe("seedGames", () => {
    it("should seed games and return their IDs", async () => {
      fetchBoardGameData.mockResolvedValue({ name: "Game 1", minplayers: 2, maxplayers: 4, playtime: 60, image: "image1.jpg", thumbnail: "thumb1.jpg" });
      Game.create.mockResolvedValue({ _id: "game1" });

      const gameIDs = await seedGames();

      expect(fetchBoardGameData).toHaveBeenCalledTimes(5);
      expect(Game.create).toHaveBeenCalledTimes(5);
      expect(console.log).toHaveBeenCalledWith("Inserted game data for ID: 234931");
      expect(gameIDs).toEqual(expect.arrayContaining(["game1"]));
    });
  });

  describe("seedUsers", () => {
    it("should seed users and return their IDs", async () => {
      User.create.mockResolvedValue({ _id: "user1" });

      const gameIDs = ["game1", "game2"];
      const userIDs = await seedUsers(gameIDs);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalled();
      expect(userIDs).toEqual(["user1"]);
    });
  });

  describe("seedEvents", () => {
    it("should seed events", async () => {
      Game.findById.mockResolvedValueOnce({ _id: "game1", minplayers: 2, maxplayers: 4, playtime: 60, image: "image1.jpg", thumbnail: "thumb1.jpg" });
      Game.findById.mockResolvedValueOnce({ _id: "game2", minplayers: 2, maxplayers: 4, playtime: 60, image: "image2.jpg", thumbnail: "thumb2.jpg" });
      User.findById.mockResolvedValue({ _id: "user1", location: "location1" });
      Event.create.mockResolvedValueOnce({ _id: "event1" });
      Event.create.mockResolvedValueOnce({ _id: "event2" });

      const gameIDs = ["game1", "game2"];
      const userIDs = ["user1"];
      await seedEvents(gameIDs, userIDs);

      expect(Game.findById).toHaveBeenCalledTimes(2);
      expect(User.findById).toHaveBeenCalledTimes(2);
      expect(Event.create).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith("Inserted event data with ID: event1");
    });
  });
});