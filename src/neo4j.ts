import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import dotenv from 'dotenv';
import { fetchAllFollowings } from './twitter/fetchAllFollowings';
import { TwitterUser } from './twitter/fetchFollowings';
import { fetchTwitterUserInfo } from './twitter/fetchTwitterUserInfo';
import logger from './logger';

dotenv.config();

const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);
const TTL_DAYS = process.env.FOLLOWINGS_TTL_DAYS ? parseInt(process.env.FOLLOWINGS_TTL_DAYS, 10) : 7;

export interface MutualUser {
  id: string;
  name: string;
  profile_url: string;
}

interface MutualFollowingsResponse {
  mutuals: MutualUser[];
  status: 'success' | 'error';
  msg?: string;
}

export async function storeUsersinNeo4j(mainUserId: string, followings: TwitterUser[]) {
    const session = driver.session();
    const timestamp = new Date().toISOString();

    try {
        logger.info(`Starting to store users in Neo4j for main user: ${mainUserId}`);
        const mainUser = await fetchTwitterUserInfo(mainUserId);
        
        if (!mainUser) {
            logger.warn(`Main user "${mainUserId}" could not be fetched from Twitter API.`);
            return;
        }

        logger.info(`Storing main user "${mainUser.id}" in Neo4j...`);

        // Set main user full info
        await session.executeWrite(tx =>
            tx.run(
                `
                MERGE (u1:User {id: $id})
                SET u1.name = $name,
                    u1.profile_url = $profile_url,
                    u1.bio = $bio,
                    u1.lastFetched = $timestamp
                `,
                {
                    id: mainUser.id,
                    name: mainUser.name,
                    profile_url: mainUser.profile_url,
                    bio: mainUser.bio,
                    timestamp
                }
            )
        );

        logger.info(`Processing ${followings.length} followings for user ${mainUserId}`);
        // Loop through each following and update details
        for (const user of followings) {
            // console.log(`Storing in Neo4j:`, user);
            await session.executeWrite(tx =>
                tx.run(
                    `
                    MERGE (u1:User {id: $mainUserId})
                    MERGE (u2:User {id: $id})
                    SET u2.name = $name,
                        u2.profile_url = $profile_url,
                        u2.bio = $bio
                    MERGE (u1)-[:FOLLOWS]->(u2)
                    `,
                    {
                        mainUserId,
                        id: user.id,
                        name: user.name,
                        profile_url: user.profile_url,
                        bio: user.bio 
                    }
                )
            );
        }
        logger.info(`Successfully stored ${followings.length} followings for user ${mainUserId}`);
    } catch (error) {
        logger.error(`Error storing users in Neo4j for ${mainUserId}: ${error}`);
        throw error;
    } finally {
        await session.close();
    }
}

export async function getMutualFollowings(userName1: string, userName2: string): Promise<MutualFollowingsResponse> {
    const session = driver.session();
    logger.info(`Fetching mutual followings between ${userName1} and ${userName2}`);

    const query = `
    MATCH (u1:User {id: $userName1})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(u2:User {id: $userName2})
    RETURN common.id AS id, common.name AS name, common.userName AS userName, common.profile_url AS profile_url
    `;

    try {
        const result = await session.executeRead(tx =>
            tx.run(query, {userName1, userName2})
        );

        const mutuals: MutualUser[] = result.records.map((record: Neo4jRecord) => ({
            id: record.get('id'),
            name: record.get('name'),
            profile_url: record.get('profile_url'),
        }));

        logger.info(`Found ${mutuals.length} mutual followings between ${userName1} and ${userName2}`);
        return {
            mutuals,
            status: 'success',
        }
    } catch (error) {
        logger.error(`Error fetching mutual followings: ${error}`);
        return {
            mutuals: [],
            status: 'error',
            msg: error instanceof Error ? error.message : 'Unknown error',
        };
    } finally {
        await session.close();
    }
}

export async function closeNeo4j() {
    logger.info('Closing Neo4j driver connection');
    await driver.close();
    logger.info('Neo4j driver connection closed');
}

export async function getUserLastFetched(userId: string): Promise<string | null> {
    const session = driver.session();
    logger.debug(`Getting last fetched timestamp for user: ${userId}`);
    try {
        const result = await session.executeRead(tx =>
            tx.run(
                `MATCH (u:User {id: $userId}) RETURN u.lastFetched as lastFetched`,
                { userId }
            )
        );
        if (result.records.length === 0) {
            logger.debug(`No last fetched timestamp found for user: ${userId}`);
            return null;
        }
        const lastFetched = result.records[0].get(`lastFetched`) || null;
        logger.debug(`Last fetched timestamp for ${userId}: ${lastFetched}`);
        return lastFetched;
    } catch (error) {
        logger.error(`Error getting last fetched timestamp for ${userId}: ${error}`);
        throw error;
    } finally {
        await session.close();
    }
}

export async function ensureFreshFollowings(userId: string): Promise<void> {
    userId = userId.toLowerCase();
    logger.debug(`ensureFreshFollowings called for ${userId}`);
    const lastFetched = await getUserLastFetched(userId);
    let needsSync = false;

    if (!lastFetched) {
        logger.info(`${userId} has no lastFetched timestamp, needs sync`);
        needsSync = true;
    } else {
        const last = new Date(lastFetched);
        const now = new Date();
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const ageDays = (now.getTime() - last.getTime()) / MS_PER_DAY;
        logger.info(`${userId} last fetched ${ageDays.toFixed(2)} days ago`);
        if (ageDays > TTL_DAYS) needsSync = true;
    }

    if (needsSync) {
        logger.info(`Syncing followings for ${userId}`);
        const allFollowings = await fetchAllFollowings(userId);
        await storeUsersinNeo4j(userId, allFollowings);
        logger.info(`Successfully synced ${allFollowings.length} followings for ${userId}`);
    } else {
        logger.info(`${userId} followings are fresh, no sync needed`);
    }
}

export async function storeSingleUserInNeo4j(userId: string): Promise<void> {
    const session = driver.session();
    logger.info(`Storing single user in Neo4j: ${userId}`);
    const user: TwitterUser | null = await fetchTwitterUserInfo(userId);

    if(!user) {
        logger.warn(`Could not fetch user info for ${userId}`);
        return;
    }

    const timestamp = new Date().toISOString();

        try {
        await session.executeWrite(tx =>
            tx.run(
                `
                MERGE (u:User {id: $id})
                SET u.name = $name,
                    u.profile_url = $profile_url,
                    u.bio = $bio,
                    u.lastFetched = $timestamp
                `,
                {
                    id: user.id,
                    name: user.name,
                    profile_url: user.profile_url,
                    bio: user.bio,
                    timestamp
                }
            )
        );
        logger.info(`Successfully stored user ${userId} in Neo4j`);
    } catch (error) {
        logger.error(`Error storing single user ${userId} in Neo4j: ${error}`);
        throw error;
    } finally {
        await session.close();
    }
}