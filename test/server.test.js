const request = require("supertest");
const app = require("../src/server")
const mongoose = require("mongoose");
const { databaseURL } = require("../src/config/config");
const { User } = require("../src/models/models");
const { createJWT } = require("../src/utils/_utils");

let token = ""
let badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YjQ0NWE0N2JjZTdmYmEzMDZmNGE2YSIsImlhdCI6MTcyMzA5MDM0MCwiZXhwIjoxNzIzNjk1MTQwfQ.Nbyxsrjo76lvjJ8gDWDJzERjqmMnJ5shTc4wi-b7744"

beforeAll(async () => {
    await mongoose.connect(databaseURL);
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
});

afterAll(async() => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
})
// Test UserRoutes
describe('UserRouter', () => {
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
            console.log(token)

            const response = await request(app).post('/user/register').send(user)

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
            .set("Authorization", `Bearer ${token}`)
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

    })
})