# GamePlan

GamePlan is an event hosting and planning tool that allows users to add boardgames they own to a collection, host events, and join events that others are hosting.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)
- [Contact Information](#contact-information)

## Installation

### System Requirements
This project was designed on MacOS Sonoma 14.5 while this code may work on other versions or operating systems testing has not been completed to ensure backwards compatibility
- Node.js and npm

### Steps

1. Clone the repository:

   ```
   git clone <repository-url>
   cd <repository-directory>
    ```

2. Install the dependencies:

   ```npm install```

## Usage

### Running the Application

GamePlan can be run locally or deployed to a platform like Render. It uses a MongoDB database, which can be run locally or deployed on MongoDB Atlas.

To run the application locally, use:

```npm start```

### Important Commands

- To seed the database with some games, 2 events, and 1 user, run:

  ```npm run seed```

## Configuration

### Environment Variables

Refer to the `.env.example` file for all the required environment variables. Create a `.env` file in the root directory and add the necessary variables.

### Sample .env File
```
HOST=localhost
PORT=3000
DATABASE_URL_DEV=mongodb://localhost:27017/GamePlanDB-dev
DATABASE_URL_TEST=mongodb://localhost:27017/GamePlanDB-test
DATABASE_URL_PROD=
JWT_KEY=your_jwt_secret_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```
## Features

- CRUD operations for users and events.
- Games are fetched externally from the BoardGameGeek API.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.