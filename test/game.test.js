const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const { User, Game } = require('../src/models/models');

// Describe the test suite for game-related tests
describe('Games', () => {
    let user;
    let jwt;
    // Before each test, clear the necessary collections and set up initial data
    beforeAll(async () => {
        try {
            await User.deleteMany({});
            await Game.deleteMany({});

            // Create a new user directly in the database with a unique email and username
            user = new User({
                email: `testuser+${Date.now()}@example.com`,
                password: 'Test@1234',
                username: `testuser${Date.now()}`,
                securityQuestionOne: 'car',
                securityQuestionTwo: 'blue',
                securityQuestionThree: 'dog'
            });
            await user.save();

            // Log in the user to get a JWT token
            const res = await request(app)
                .post('/user/login')
                .send({ username: user.username, password: 'Test@1234' });

            jwt = res.body.jwt;
        } catch (error) {
            console.error('Error in beforeEach hook:', error);
        }
    });

    // After all tests, close the database connection
    afterAll(async () => {
        await mongoose.connection.close();
    });

    // SEARCH FOR GAMES
    describe('/GET games/search', () => {
        // Successful search for games test
        it('it should search for games', async () => {
            const query = 'Test Game'; // Example search query

            // Send a GET request to /games/search
            const res = await request(app)
                .get('/games/search')
                .set('Authorization', `Bearer ${jwt}`)
                .query({ query });

            // The response status should be 200 (OK)
            expect(res.status).toBe(200);

            // The response body should contain the search results
            expect(res.body).toHaveProperty('games');
            expect(res.body.games).toBeInstanceOf(Array);
        });
    });
});