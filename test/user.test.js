const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const { User } = require('../src/models/models');

describe('Users', () => {
    let jwt;

    // Before each test, clear the User collection
    beforeEach(async () => {
        await User.deleteMany({});

        // Create a new user directly in the database
        const user = new User({
            email: 'testuser@example.com',
            password: 'Test@1234',
            username: 'testuser'
        });
        await user.save();

        // Log in the user to get a JWT token
        const res = await request(app)
        .post('/user/login')
        .send({ username: 'testuser', password: 'Test@1234' });

        jwt = res.body.jwt;
    });

    // After all tests, close the database connection
    afterAll(async () => {
        await mongoose.connection.close();
    });

    // USER REGISTRATION
    describe('/POST register', () => {
        // Successful user registration test
        it('it should register a new user', async () => {
            const user = {
                email: 'testuser2@example.com',
                password: 'Test@1234',
                username: 'testuser2',
            };

            // Send a POST request to /user/register
            const res = await request(app)
            .post('/user/register')
            .send(user);

            // The response status should be 201
            expect(res.status).toBe(201);

            // The response body should contain a success message
            expect(res.body).toHaveProperty('message', 'User registered successfully');

            // The response body should contain the user's email and username
            expect(res.body.user).toHaveProperty('email', user.email);
            expect(res.body.user).toHaveProperty('username', user.username);
        });
    });

    // USER LOGIN
    describe('/POST login', () => {
        // Successful user login test
        it('it should login an existing user', async () => {
            // Send a POST request to /user/login
            const res = await request(app)
            .post('/user/login')
            .send({ username: 'testuser', password: 'Test@1234' });

            // The response status should be 200
            expect(res.status).toBe(200);

            // The response body should contain a success message with the username
            expect(res.body).toHaveProperty('message', 'testuser has logged in!');

            // The response body should contain a JWT token
            expect(res.body).toHaveProperty('jwt');
        });
    });

    // RETRIEVE USER INFORMATION
    describe('/GET user', () => {
        // Retrieving user information test
        it('it should retrieve user information', async () => {
            // Send a GET request to the /user endpoint with the JWT token
            const res = await request(app)
            .get('/user')
            .set('Authorization', `Bearer ${jwt}`);

            // The response status should be 200
            expect(res.status).toBe(200);

            // The response body should contain the user's email and username
            expect(res.body).toHaveProperty('email', 'testuser@example.com');
            expect(res.body).toHaveProperty('username', 'testuser');
        });
    });

    // UPDATE USER DETAILS
    describe('/PATCH update', () => {
        // Update user details test
        it('it should update user details', async () => {
            const updatedDetails = {
                username: 'updatedUser',
                location: 'New Location'
            };

            // Send a PATCH request to /user/update
            const res = await request(app)
            .patch('/user/update')
            .set('Authorization', `Bearer ${jwt}`)
            .send(updatedDetails);

            // The response status should be 200
            expect(res.status).toBe(200);

            // The response body should contain a success message and the updated user details
            expect(res.body.updatedUser).toHaveProperty('username', 'updatedUser');
            expect(res.body.updatedUser).toHaveProperty('location', 'New Location');
        });
    });

    // DELETE USER
    describe('/DELETE user', () => {
    // Deleting a user test
        it('it should delete the user', async () => {
            // Send a DELETE request to /user
            const res = await request(app)
            .delete('/user')
            .set('Authorization', `Bearer ${jwt}`);

            // The response status should be 200
            expect(res.status).toBe(200);

            // The response body should contain a success message
            expect(res.body).toHaveProperty('message', 'User deleted successfully');

            // Verify that the user no longer exists in the database
            const user = await User.findOne({ email: 'testuser@example.com' });
            expect(user).toBeNull();
        });
    });

    // INCORRECT LOGIN
    describe('/POST login with incorrect credentials', () => {
        // Incorrect login credentials test
        it('it should not login with incorrect credentials', async () => {
            // Send a POST request to /user/login
            const res = await request(app)
            .post('/user/login')
            .send({ username: 'testuser', password: 'WrongPassword' });

            // The response status should be 401
            expect(res.status).toBe(401);

            // The response body should contain an error message
            expect(res.body).toHaveProperty('message', 'Incorrect password');
        });
    });
});