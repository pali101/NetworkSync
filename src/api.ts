import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fetchAllFollowings } from './twitter/fetchAllFollowings';
import { getMutualFollowings, ensureFreshFollowings, storeSingleUserInNeo4j } from './neo4j';
import logger from './logger';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 4000;

// Add request logging middleware
app.use((req, res, next) => {
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    next();
});

// Fetch and store followings (trigger sync)
app.post('/api/sync', async (req, res) => {
    const userName = (req.body?.userName ?? '').toLowerCase();
    logger.info('POST /api/sync - Request received', { userName });
    
    if (!userName) {
        logger.warn('POST /api/sync - Missing userName in request body');
        res.status(400).json({error: 'userName required'});
        return;
    } 
    
    try {
        logger.info('POST /api/sync - Starting sync process', { userName });
        await ensureFreshFollowings(userName);
        logger.info('POST /api/sync - Sync completed successfully', { userName });
        res.json({status: 'success'});
    } catch (err) {
        logger.error('POST /api/sync - Sync failed', { userName, error: (err as Error).message });
        res.status(500).json({status: 'error', error: (err as Error).message});
    }
});

// Get mutual followings
app.get('/api/mutual', async (req, res) => {
    const user1 = typeof req.query.user1 === 'string' ? req.query.user1.toLowerCase() : '';
    const user2 = typeof req.query.user2 === 'string' ? req.query.user2.toLowerCase() : '';
    logger.info('GET /api/mutual - Request received', { user1, user2 });
    
    if (!user1 || !user2) {
        logger.warn('GET /api/mutual - Missing required parameters', { user1, user2 });
        res.status(400).json({error: 'user1 and user2 required'});
        return;
    }
    
    try {
        logger.info('GET /api/mutual - Ensuring fresh followings for both users', { user1, user2 });
        await ensureFreshFollowings(user1);
        await ensureFreshFollowings(user2);
        
        logger.info('GET /api/mutual - Fetching mutual followings', { user1, user2 });
        const result = await getMutualFollowings(user1 as string, user2 as string);
        
        if (result.status === 'error') {
            logger.error('GET /api/mutual - Failed to get mutual followings', { 
                user1, user2, error: result.msg 
            });
            res.status(500).json({status: 'error', error: result.msg ?? 'Something went wrong'});
            return;
        }

        logger.info('GET /api/mutual - Successfully retrieved mutual followings', { 
            user1, user2, mutualCount: result.mutuals?.length || 0 
        });
        res.json ({status: 'success', data: {mutuals: result.mutuals}});
    } catch (err) {
        logger.error('GET /api/mutual - Unexpected error', { 
            user1, user2, error: (err as Error).message 
        });
        res.status(500).json({status: 'error', error: (err as Error).message});
    }
});

// Fetch only
app.get('/api/followings/:userName', async (req, res) => {
    const userName = req.params.userName?.toLowerCase() || '';
    logger.info('GET /api/followings/:userName - Request received', { userName });
    
    if (!userName) {
        logger.warn('GET /api/followings/:userName - Missing userName parameter');
        res.status(400).json({error: 'userName required'});
        return;
    }
    
    try {
        logger.info('GET /api/followings/:userName - Fetching followings', { userName });
        const users = await fetchAllFollowings(userName);
        logger.info('GET /api/followings/:userName - Successfully fetched followings', { 
            userName, followingCount: users.length 
        });
        res.json({status: 'success', followings: users});
    } catch (err) {
        logger.error('GET /api/followings/:userName - Failed to fetch followings', { 
            userName, error: (err as Error).message 
        });
        res.status(500).json({status: 'error', error : (err as Error).message});
    }
});

// Fetch and store user details (single user)
app.post('/api/user/store', async(req, res) => {
    const userName = (req.body?.userName ?? '').toLowerCase();
    logger.info('POST /api/user/store - Request received', { userName });
    
    if (!userName) {
        logger.warn('POST /api/user/store - Missing userName in request body');
        res.status(400).json({error: 'userName required'});
        return;
    }

    try {
        logger.info('POST /api/user/store - Storing user in Neo4j', { userName });
        await storeSingleUserInNeo4j(userName);
        logger.info('POST /api/user/store - Successfully stored user', { userName });
        res.json({ status: 'success', userId: userName});
    } catch (err) {
        logger.error('POST /api/user/store - Failed to store user', { 
            userName, error: (err as Error).message 
        });
        res.status(404).json({ status: 'error', error: (err as Error).message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    logger.info('GET /health - Health check requested');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;

// Only start the server if run directly (not imported by test files)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`API server started successfully`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
}