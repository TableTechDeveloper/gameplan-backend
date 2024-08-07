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

        const res = await request(app)
            .post('/user/login')
            .send({ username: user.username, password: 'Test@1234' });

        jwt = res.body.jwt;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('/GET games/search', () => {
        it('it should search for games', async () => {
            const query = 'Test Game';

            const res = await request(app)
                .get('/games/search')
                .set('Authorization', `Bearer ${jwt}`)
                .query({ query });

            console.log(res.body);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('games');
            expect(res.body.games).toBeInstanceOf(Array);
        });

        it('it should not search for games without JWT', async () => {
            const query = 'Test Game';

            const res = await request(app)
                .get('/games/search')
                .query({ query });

            console.log(res.body);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Access Denied. No Authorization header provided');
        });
    });

    describe('/POST games/add', () => {
        it('it should add a game to the user\'s collection', async () => {
            const gameId = 29646;

            const res = await request(app)
                .post('/games/add')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ gameId });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Test Game added to collection successfully');
        });

        it('it should return 400 if game ID is missing', async () => {
            const res = await request(app)
                .post('/games/add')
                .set('Authorization', `Bearer ${jwt}`)
                .send({});

            console.log(res.body);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Missing game ID');
        });

        it('it should return 400 if game already in collection', async () => {
            const gameId = 29646;

            await request(app)
                .post('/games/add')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ gameId });

            const res = await request(app)
                .post('/games/add')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ gameId });

            console.log(res.body);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Game already in collection');
        });

        it('it should not add a game to the user\'s collection without JWT', async () => {
            const gameId = 29646;

            const res = await request(app)
                .post('/games/add')
                .send({ gameId });

            console.log(res.body);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Access Denied. No Authorization header provided');
        });
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