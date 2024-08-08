const request = require("supertest");
const app = require("../src/server")
const mongoose = require("mongoose");
const { databaseURL } = require("../src/config/config");
const { User, Game } = require("../src/models/models");
const { createJWT } = require("../src/utils/_utils");

let token = ""
let deletedUserToken = ""
let wrongUserToken = ""
let badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YjQ0NWE0N2JjZTdmYmEzMDZmNGE2YSIsImlhdCI6MTcyMzA5MDM0MCwiZXhwIjoxNzIzNjk1MTQwfQ.Nbyxsrjo76lvjJ8gDWDJzERjqmMnJ5shTc4wi-b7744"

beforeAll(async () => {
    await mongoose.connect(databaseURL);
        await User.deleteMany({})
        const user = new User ({
            email: "ADMIN@test.com",
            password: "authenticated@1234",
            username: "ADMIN",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });

        await user.save();
        token = createJWT(user._id)
        const userToBeDeleted = new User ({
            email: "ADMIN2@test.com",
            password: "authenticated@1234",
            username: "ADMIN2",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });

        await userToBeDeleted.save();
        deletedUserToken = createJWT(userToBeDeleted._id);

        const wrongUser = new User ({
            email: "ADMIN3@test.com",
            password: "authenticated@1234",
            username: "ADMIN3",
            securityQuestionOne: "One",
            securityQuestionTwo: "Two",
            securityQuestionThree: "Three"
        });
        
        await wrongUser.save();
        wrongUserToken = createJWT(wrongUser._id)
});

afterAll(async() => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
})
// Test UserRoutes
describe('UserRouter-standard', () => {
    describe("POST /user/register", () => {
        it("should register a new user", async () => {
            const user = {
                email: "jest@test.com",
                password: "Test@1234",
                username: "Jester",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three"
            };

            const response = await request(app).post('/user/register').send(user)
            secondJesterToken = createJWT(user._id)

            expect(response.status).toBe(201)
            expect(response.body).toHaveProperty("message", "User registered successfully")
        });

        it("should not register a new user with a duplicate email address", async () => {
            const user = {
                email: "jest@test.com",
                password: "Test@1234",
                username: "Jester",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three"
            }
            const user2 = {
                email: "jest@test.com",
                password: "Test@1234",
                username: "Jester",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three"
            }

            await request(app).post('/user/register').send(user) 
            const response = await request(app).post('/user/register').send(user2) 

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "This email address or username is already in use!")
        })

        it("should not register a new user is password validation fails", async () => {
            const user = {
                email: "jest2@test.com",
                password: "Test1234",
                username: "Jester2",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three"
            };

            const response = await request(app).post('/user/register').send(user);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message", "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.")

        })
    });

    describe("POST /user/login", () => {
        it("should login the user and provide a jwt", async () => {
            const user = {
                username: "Jester",
                password: "Test@1234"
            };

            const response = await request(app).post('/user/login').send(user)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Jester has logged in!")
        });

        it("should provide error is username is missing", async () => {
            const user = {};

            const response = await request(app).post('/user/login').send(user)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Missing login details")
        });

        it("should return error if no user is found", async () => {
            const user = {
                username: "fakeymcfakenson",
                password: "RazzleDazzle"
            };

            const response = await request(app).post('/user/login').send(user)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });

        it("should return incorrect password error if password is wrong", async () => {
            const user = {
                username: "Jester",
                password: "OppsieDoodle"
            };

            const response = await request(app).post('/user/login').send(user)

            expect(response.status).toBe(401)
            expect(response.body).toHaveProperty("message", "Incorrect password")
        })
    });

    describe("POST /user/password-reset", () => {
        it("should reset a users password if security challenges met", async () => {
            const user = {
                email: "jest@test.com",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three",
                password: "New@12345"
            };

            const response = await request(app).post('/user/password-reset').send(user)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Password reset successfully")
        });

        it("should return an error if no user exists", async () => {
            const user = {
                email: "jester@test.com",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three",
                password: "New@12345"
            };

            const response = await request(app).post('/user/password-reset').send(user)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });

        it("should return an error if any security answers are incorrect", async () => {
            const user = {
                email: "jest@test.com",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Pineapple",
                password: "New@12345"
            };

            const response = await request(app).post('/user/password-reset').send(user)

            expect(response.status).toBe(401)
            expect(response.body).toHaveProperty("message", "Incorrect security details provided")
        });

        it("should return an error if the new password does not meet validation requirements", async () => {
            const user = {
                email: "jest@test.com",
                securityQuestionOne: "One",
                securityQuestionTwo: "Two",
                securityQuestionThree: "Three",
                password: "New12345"
            };

            const response = await request(app).post('/user/password-reset').send(user)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.")
        });
    });

    describe("PATCH /user/update", () => {
        it("should update a users bio and location", async () => {
            user = {
                location: "In the computer",
                bio: "Beep boop, I am a robot"
            };

            const response = await request(app).patch('/user/update')
            .set("Authorization", `Bearer ${token}`)
            .send(user)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "User details have been updated!")
        });

        it("should return an error if the new password does not meet validation requirements", async () => {
            user = {
                password: "In the computer",
            };

            const response = await request(app).patch('/user/update')
            .set("Authorization", `Bearer ${token}`)
            .send(user)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("message", "Password must be between 8-16 characters and include an uppercase letter, lowercase letter, number, and special character.")
        });

        it("should return an error if no user exists", async () => {
            user = {
                password: "Update@1234",
            };

            const response = await request(app).patch('/user/update')
            .set("Authorization", `Bearer ${badToken}`) // got an old token from a few tests ago
            .send(user)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });
    });

    describe('GET /user/', () => {
        it("should show the users details", async () => {
            const response = await request(app).get('/user/')
            .set("Authorization", `Bearer ${token}`)
            .send(user)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "User retrieved successfully")
        });

        it("should return an error if no user exists", async () => {
            const response = await request(app).get('/user/')
            .set("Authorization", `Bearer ${badToken}`)
            .send(user)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });
    });

    describe('DELETE /user/', () => {
        it("should delete the user", async () => {
            const response = await request(app).delete('/user/')
            .set("Authorization", `Bearer ${deletedUserToken}`)
            .send(user)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "User deleted successfully")
        });

        it("should return an error if no user exists", async () => {
            const response = await request(app).delete('/user/')
            .set("Authorization", `Bearer ${badToken}`)
            .send(user)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
        });
    });

});
// Test GameRoutes
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

    describe("POST /add", () => {
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
})
// Test UserRoutes after games have been populated
describe("UserRouter-Games", () => {
    describe("GET /user/collection", () => {
        it("should show all games added to the users collection", async () => {
            const response = await request(app).get("/user/collection")
            .set("Authorization", `Bearer ${token}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Games retrieved successfully")
        });

        it("should show games matching a search parameter added to the users collection", async () => {
            const response = await request(app).get("/user/collection")
            .set("Authorization", `Bearer ${token}`)
            .query({
                search: "Galaxy Trucker"
            })

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty("message", "Games retrieved successfully")
        });

        it("should error when user is not authenticated", async () => {
            const response = await request(app).get('/user/collection')
            .set("Authorization", `Bearer ${badToken}`)

            expect(response.status).toBe(404)
            expect(response.body).toHaveProperty("message", "User not found")
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
            expect(response.body).toHaveProperty("message", "Game: Galaxy Trucker has been removed from ADMIN's collection successfully")
        });

        it("should error if the game is not found", async () => {
            const user = await User.findOne({ email: "ADMIN@test.com" }).exec()

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
                title: "Test event",
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
                isPublic: true
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
            .set("Authorization", `Bearer ${wrongUserToken}`)
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

        it("should return an error if there is missing details for a published game", async () => {
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

    })
})