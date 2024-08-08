const request = require("supertest");
const app = require("../src/server")
const mongoose = require("mongoose");
const { databaseURL } = require("../src/config/config");
const { User, Game, Event } = require("../src/models/models");
const { createJWT } = require("../src/utils/_utils");

let token = ""
let otherUserToken = ""
let sadUserToken = ""
let badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YjQ0NWE0N2JjZTdmYmEzMDZmNGE2YSIsImlhdCI6MTcyMzA5MDM0MCwiZXhwIjoxNzIzNjk1MTQwfQ.Nbyxsrjo76lvjJ8gDWDJzERjqmMnJ5shTc4wi-b7744"

beforeAll(async () => {
    await mongoose.connect(databaseURL);
        await User.deleteMany({
            username: { $in: ["EventUser", "OtherUser", "sadUser"]}
        });

        await Event.deleteMany({});
        const user = new User ({
            email: "EventUser@test.com",
            password: "authenticated@1234",
            username: "EventUser",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });

        await user.save();
        token = createJWT(user._id);

        const otherUser = new User ({
            email: "OtherUser@test.com",
            password: "authenticated@1234",
            username: "OtherUser",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });
        
        await otherUser.save();
        otherUserToken = createJWT(otherUser._id);

        const sadUser = new User ({
            email: "sadUser@test.com",
            password: "authenticated@1234",
            username: "sadUser",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });
        
        await sadUser.save();
        sadUserToken = createJWT(sadUser._id)

});

afterAll(async() => {
    await mongoose.connection.close();
})

describe("EventRouter", () => {
    describe("GET /events/", () => {
        it("should show all public and published events", async () => {
            const response = await request(app).get("/events/");

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Events retrieved successfully")
        });
    });

    describe("POST /events/new", () => {
        it("should create a new public draft event", async () => {
            // Add game to user collection
            const game = { gameId: "31481" }
            const addedGame  = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${token}`)
            .send(game);

            const event = {
                title: "Test draft event",
                game: addedGame.body.id,
                isPublished: false
            };

            const response = await request(app).post("/events/new")
            .set("Authorization", `Bearer ${token}`)
            .send(event);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("message", "Event created successfully")
        });

        it("should create a new public published event", async () => {
            // Add game to user collection
            const foundGame = await Game.findOne({ boardgamegeekref: 31481 }).exec()

            const event = {
                title: "Test published event",
                eventDate: new Date(),
                game: foundGame._id,
                location: "My house",
                isPublished: true,
                isPublic: true,
                maxParticipants: 2
            };

            const response = await request(app).post("/events/new")
            .set("Authorization", `Bearer ${token}`)
            .send(event);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("message", "Event created successfully")
        });

        it("should return an error if the game does not exist", async () => {
            const notRealGame = await User.findOne({}).exec()
            const event = {
                title: "Test event",
                game: notRealGame._id,
                isPublished: false
            };

            const response = await request(app).post("/events/new")
            .set("Authorization", `Bearer ${token}`)
            .send(event);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message", "Game not found")
        });

        it("should return an error if the host does not own the game for the event", async () => {
            const game = { gameId: "179172" }
            const notOwnedGame = await request(app).post('/games/add')
            .set("Authorization", `Bearer ${otherUserToken}`)
            .send(game);

            console.log("GAME ID: ", notOwnedGame.body.id)

            const event = {
                title: "Test event",
                game: notOwnedGame.body.id,
                isPublished: false
            };
            console.log(event.game)

            const response = await request(app).post("/events/new")
            .set("Authorization", `Bearer ${token}`)
            .send(event);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message", "Game not owned")
        });

        it("should return an error if there is missing details for a published event", async () => {
            // Add game to user collection
            const foundGame = await Game.findOne({ boardgamegeekref: 31481 }).exec()

            const event = {
                title: "Test published event",
                eventDate: new Date(),
                game: foundGame._id,
                isPublished: true,
                isPublic: true
            };

            const response = await request(app).post("/events/new")
            .set("Authorization", `Bearer ${token}`)
            .send(event);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message", "Missing required fields for published event")
        });

    });

    describe("GET /events/:id", () => {
        it("should provide the user the event details", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id }).exec();
            const response = await request(app).get(`/events/${event._id}`)
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Event retrieved successfully")

        });

        it("should error is user is not logged in", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id }).exec();
            const response = await request(app).get(`/events/${event._id}`)
            .set("Authorization", `Bearer ${badToken}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });

        it("should error if the event does not exist", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const response = await request(app).get(`/events/${user._id}`)
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Event not found")
        })
    });

    describe("POST /events/:id/register", () => {
        it("should register the user as going", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: true }).exec();

            const response = await request(app).post(`/events/${event._id}/register`)
            .set("Authorization", `Bearer ${otherUserToken}`)


            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "User has successfully registered for the Test published event event");
        });

        it("should error if the event does not exist", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();

            const response = await request(app).post(`/events/${user._id}/register`)
            .set("Authorization", `Bearer ${otherUserToken}`)


            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Event not found");
        });

        it("should error if the user does not exist", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: true }).exec();

            const response = await request(app).post(`/events/${event._id}/register`)
            .set("Authorization", `Bearer ${badToken}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found");
        });

        it("should error if the user is already a participant", async() => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: true }).exec();

            const response = await request(app).post(`/events/${event._id}/register`)
            .set("Authorization", `Bearer ${token}`)


            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "User already registered for this event");
        });

        it("should error if the game is full", async() => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: true }).exec();

            const response = await request(app).post(`/events/${event._id}/register`)
            .set("Authorization", `Bearer ${sadUserToken}`)

            console.log(response.error)
            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "This event is full");
        });

        it("should error if the event is not published", async () => {
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: false }).exec();

            const response = await request(app).post(`/events/${event._id}/register`)
            .set("Authorization", `Bearer ${otherUserToken}`)


            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "This event is not ready yet!");
        })
    });

    describe("PATCH /events/:id", () => {
        it("should error if the event is published and does not have required location information", async () => {
            eventUpdate = {
                isPublished: true,
                eventDate: new Date()
            };
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: false }).exec();
            const response = await request(app).patch(`/events/${event._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(eventUpdate)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Missing required location for published event")
        });
        it("should update the event", async () => {
            eventUpdate = {
                location: "In the computer"
            };
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: false }).exec();
            const response = await request(app).patch(`/events/${event._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(eventUpdate)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Event updated successfully")
        });

        it("should error if the event doesn't exist", async () => {
            eventUpdate = {
                location: "In the computer"
            };
            const user = await User.findOne({ username: "EventUser" }).exec();
            const response = await request(app).patch(`/events/${user._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(eventUpdate)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "Event not found")
        });

        it("should error if it is not the host editing", async () => {
            eventUpdate = {
                location: "In the computer"
            };
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: false }).exec();
            const response = await request(app).patch(`/events/${event._id}`)
            .set("Authorization", `Bearer ${otherUserToken}`)
            .send(eventUpdate)

            expect(response.status).toBe(403)
            expect(response.body).toHaveProperty("message", "Only the host may perform this action")
        });

        it("should error if the event is published and does not have required eventDate information", async () => {
            eventUpdate = {
                isPublished: true,
            };
            const user = await User.findOne({ username: "EventUser" }).exec();
            const event = await Event.findOne({ host: user._id, isPublished: false }).exec();
            const response = await request(app).patch(`/events/${event._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(eventUpdate)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Missing required event date for published event")
        });
    })
})