# NetworkSync

Network Sync project is part of PLDG (Protocol Labs Dev Guild), where I'm collaborating with LabOS to analyze social connections by identifying mutual Twitter followings between users.

## What it does?
- Fetches a X user's following using TwitterAPI.io
- Store those relationships in a Neo4j graph database
- Allows querying for mutual followings between any two users

## Structure
- `src/`: Contains the main application code.
    - `twitter.ts`: Fetch twiter followings via API
    - `neo4j.ts`: Store users and relations in Neo4j and find mutual followings
    - `index.ts`: CLI interface to interact with the system
- `frontend/`: Next.js app for the user interface. 
- `tests/`: Contains unit tests for the application.
- `package.json`: Project dependencies and scripts.
- `README.md`: Project documentation.
- `tsconfig.json`: TypeScript configuration file.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/pali101/NetworkSync.git
cd NetworkSync

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Then fill in your .env file with the appropriate values
```

## Backend CLI Usage

```bash
# Fetch and display all followings
npm start fetch <twitterUsername>

# Fetch and store in Neo4j
npm start sync <twitterUsername>

# Find mutual followings between two users
npm start mutual <username1> <username2>
```

## API Endpoints

### `GET /api/mutual?user1=alice&user2=bob` 
Finds mutual followings between two Twitter users.

### `POST /api/sync`
Syncs a user's followings with the Neo4j database.

Request body should contain:
```json
{
  "userName": "twitterUsername"
}
```

### `POST /api/user/store`
Stores a Twitter user in the Neo4j database.

Request body should contain:
```json
{
  "userName": "twitterUsername"
}
```

## Frontend Usage
```bash
# Navigate to the frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the Next.js development server
npm run dev
```
Then open your browser and go to `http://localhost:3000` to access the frontend interface.

## Requirements

- Node.js
- TypeScript
- Neo4j instance running
- TwitterAPI.io account with API keys
- `.env` file configured with your API keys and Neo4j connection details