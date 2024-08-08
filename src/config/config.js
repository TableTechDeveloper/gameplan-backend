const dotenv = require("dotenv");
dotenv.config();

// DRY coding for repeatable use of env variables
const config = {
  HOST: process.env.HOST || "0.0.0.0",
  PORT: process.env.PORT || 3000,
  // Detrmine which environment to use for db
  databaseURL: (() => {
    switch (process.env.NODE_ENV.toLowerCase()) {
      case "test":
        return (
          process.env.DATABASE_URL_TEST ||
          "mongodb://localhost:27017/GamePlanDB-test"
        );
      case "development":
        return (
          process.env.DATABASE_URL_DEV ||
          "mongodb://localhost:27017/GamePlanDB-dev"
        );
      case "production":
        return process.env.DATABASE_URL || "";
      default:
        console.error(
          "Incorrect JS environment specified, database will not be connected"
        );
        return "";
    }
  })(),
  jwtKey: process.env.JWT_KEY || "default_jwt_key",
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_USER: process.env.EMAIL_USER,
};

module.exports = config;