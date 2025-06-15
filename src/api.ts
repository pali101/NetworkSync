import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fetchAllFollowings } from './twitter';
import { storeUsersinNeo4j, getMutualFollowings, ensureFreshFollowings } from './neo4j';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 4000;

// Fetch and store followings (trigger sync)
app.post('/api/sync', async (req, res) => {
    const userName = (req.body?.userName ?? '').toLowerCase();
    if (!userName) {
        res.status(400).json({error: 'userName required'});
        return;
    } 
    try {
        const allFollowings = await fetchAllFollowings(userName);
        await storeUsersinNeo4j(userName, allFollowings);
        res.json({status: 'success', count: allFollowings.length});
    } catch (err) {
        res.status(500).json({status: 'error', error: (err as Error).message});
    }
});

// Get mutual followings
app.get('/api/mutual', async (req, res) => {
    const user1 = typeof req.query.user1 === 'string' ? req.query.user1.toLowerCase() : '';
    const user2 = typeof req.query.user2 === 'string' ? req.query.user2.toLowerCase() : '';
    // console.log('Received query params:', user1, user2);
    if (!user1 || !user2) {
        res.status(400).json({error: 'user1 and user2 required'});
        return;
    }
    try {
        await ensureFreshFollowings(user1);
        await ensureFreshFollowings(user2);
        
        const result = await getMutualFollowings(user1 as string, user2 as string);
        
        if (result.status === 'error') {
            res.status(500).json({status: 'error', error: result.msg ?? 'Something went wrong'});
            return;
        }

        res.json ({status: 'success', data: {mutuals: result.mutuals}});
    } catch (err) {
        res.status(500).json({status: 'error', error: (err as Error).message});
    }
});

// Fetch only
app.get('/api/followings/:userName', async (req, res) => {
    const userName = req.params.userName?.toLowerCase() || '';
    try {
        const users = await fetchAllFollowings(userName);
        res.json({status: 'success', followings: users});
    } catch (err) {
        res.status(500).json({status: 'error', error : (err as Error).message});
    }
});

export default app;

// Only start the server if run directly (not imported by test files)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}