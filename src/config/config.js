const dotenv = require('dotenv');
dotenv.config();

// DRY coding for repeatable use of env variables
const config = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 3000,
    databaseURL: (() => {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'test':
                return 'mongodb://localhost:27017/GamePlanDB-test';
            case 'development':
                return 'mongodb://localhost:27017/GamePlanDB-dev';
            case 'production':
                return process.env.DATABASE_URL;
            default:
                console.error('Incorrect JS environment specified, database will not be connected');
                return '';
        }
    })(),
    jwtKey: process.env.JWT_KEY
};

module.exports = config;