const request = require("supertest");
const app = require("../src/server")
const mongoose = require("mongoose");
const { databaseURL } = require("../src/config/config");
const { User, Game } = require("../src/models/models");
const { createJWT } = require("../src/utils/_utils");

let token = ""
let badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YjQ0NWE0N2JjZTdmYmEzMDZmNGE2YSIsImlhdCI6MTcyMzA5MDM0MCwiZXhwIjoxNzIzNjk1MTQwfQ.Nbyxsrjo76lvjJ8gDWDJzERjqmMnJ5shTc4wi-b7744"

beforeAll(async () => {
    await mongoose.connect(databaseURL);
    await User.deleteMany({
        username: { $in: ["GameUser"]}
    });
    await Game.deleteMany({})

    const user = new User ({
        email: "GameUser@test.com",
        password: "authenticated@1234",
        username: "GameUser",
        securityQuestionOne: "One",
        securityQuestionTwo: "Two",
        securityQuestionThree: "Three"
    });

    await user.save();
    token = createJWT(user._id)

}, 30000);

afterAll(async() => {
    await mongoose.connection.close();
}, 30000)

describe("GameRouter", () => {
    describe("GET /games/search", () => {
        it("should return with a single boardgame", async () => {

            const response = await request(app).get('/games/search')
            .set("Authorization", `Bearer ${token}`)
            .query({
                query: "Galaxy Trucker",
                strict: "true"
            })

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Games retrieved successfully")
        });

        it("should return with multiple boardgames", async () => {

            const response = await request(app).get('/games/search')
            .set("Authorization", `Bearer ${token}`)
            .query({
                query: "Galaxy",
                strict: "false"
            })

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Games retrieved successfully")
        });

        it("should return an error when search parameter missing", async () => {

            const response = await request(app).get('/games/search')
            .set("Authorization", `Bearer ${token}`)
            .query({
                strict: "false"
            })

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Missing search query")
        });

        it("should return with an error when no game is found", async () => {

            const response = await request(app).get('/games/search')
            .set("Authorization", `Bearer ${token}`)
            .query({
                query: "GalaxyTrucker",
                strict: "true"
            })

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "No games found")
        });

    })

    describe("GET /games/:id", () => {
        it("should return with details about a single boardgame", async () => {

            const response = await request(app).get('/games/31481')
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Game retrieved successfully")
        });

        it("should return with an error if the game does not exist", async () => {

            const response = await request(app).get('/games/999999')
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Game not found")
        });

    })

    describe("POST /games/add", () => {
        it("should add a boardgame to the user", async () => {
            const game = { gameId: "31481" }

            const response = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send(game);

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Galaxy Trucker added to collection successfully")
        });

        it("should error when no gameId is provided", async () => {
            const game = {}

            const response = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send(game);

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Missing game ID")
        });

        it("should error when no game is found", async () => {
            const game = { gameId: "999999" }

            const response = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send(game);

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Game not found")
        });

        it("should error when user is not authenticated", async () => {
            const game = { gameId: "31481" }

            const response = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${badToken}`)
            .send(game);

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });

        it("should error when user attempts to add same game twice", async () => {
            const game = { gameId: "31481" }

            const response = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send(game);

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Game already in collection")
        });
    })

    describe("DELETE /user/collection/:id", () => {
        it("should delete a game from the users collection", async () => {
            await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send("31481");

            const gameToRemove = await Game.findOne({ boardgamegeekref: 31481 })

            const response = await request(app).delete(`/user/collection/${gameToRemove._id}`)
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Game: Galaxy Trucker has been removed from GameUser's collection successfully")
        });

        it("should error if the game is not found", async () => {
            const user = await User.findOne({ email: "GameUser@test.com" }).exec()

            const response = await request(app).delete(`/user/collection/${user._id}`)
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Game not found")
        });

        it("should error if the user is not found", async () => {
            await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send("426129");

            const gameToRemove = await Game.findOne({ boardgamegeekref: 31481 })

            const response = await request(app).delete(`/user/collection/${gameToRemove._id}`)
            .set("Authorization", `Bearer ${badToken}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });

        it("should error if the game is not in the users game collection", async () => {
            const gameToRemove = await Game.findOne({ boardgamegeekref: 31481 })

            const response = await request(app).delete(`/user/collection/${gameToRemove._id}`)
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Game not in collection")
        });
    })
});