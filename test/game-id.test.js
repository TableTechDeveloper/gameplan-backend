const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const { User, Game } = require('../src/models/models');

describe('Games', () => {
    let user;
    let jwt;

    beforeAll(async () => {
        await User.deleteMany({});
        await Game.deleteMany({});

        user = new User({
            email: `testuser+${Date.now()}@example.com`,
            password: 'Test@1234',
            username: `testuser${Date.now()}`,
            securityQuestionOne: 'car',
            securityQuestionTwo: 'blue',
            securityQuestionThree: 'dog'
        });

        await user.save();
        console.log('User created:', user);

        const res = await request(app)
            .post('/user/login')
            .send({ username: user.username, password: 'Test@1234' });

        jwt = res.body.jwt;
        console.log('JWT:', jwt);
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('/GET games/:id', () => {
        it('it should fetch detailed game data by ID', async () => {
            const gameId = 29646;

            const res = await request(app)
                .get(`/games/${gameId}`)
                .set('Authorization', `Bearer ${jwt}`);

            console.log(res.body);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('game');
            expect(res.body.game).toHaveProperty('name', 'Battle of the Sexes Card Game: IQ Test');
        });

        it('it should return 404 if game not found', async () => {
            const gameId = 9999999;

            const res = await request(app)
                .get(`/games/${gameId}`)
                .set('Authorization', `Bearer ${jwt}`);

            console.log(res.body);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'Game not found');
        });

        it('it should not fetch detailed game data without JWT', async () => {
            const gameId = 29646;

            const res = await request(app)
                .get(`/games/${gameId}`);

            console.log(res.body);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Access Denied. No Authorization header provided');
        });
    });
});