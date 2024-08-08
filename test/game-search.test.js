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
});