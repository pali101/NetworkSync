import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import dotenv from 'dotenv';
import { fetchAllFollowings, TwitterUser } from './twitter';
dotenv.config();

const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);
const TTL_DAYS = process.env.FOLLOWINGS_TTL_DAYS ? parseInt(process.env.FOLLOWINGS_TTL_DAYS, 10) : 7;

export interface MutualUser {
  id: string;
  name: string;
  userName: string;
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
        // Set mainUserId lastFetched
        await session.executeWrite(tx =>
            tx.run(
                `
                MERGE (u1:User {id: $mainUserId})
                SET u1.lastFetched = $timestamp
                `,
                {
                    mainUserId,
                    timestamp
                }
            )
        );

        // Loop through each following and update details
        for (const user of followings) {
            // console.log(`Storing in Neo4j:`, user);
            await session.executeWrite(tx =>
                tx.run(
                    `
                    MERGE (u1:User {id: $mainUserId})
                    MERGE (u2:User {id: $id})
                    SET u2.name = $name,
                        u2.userName = $userName,
                        u2.profile_url = $profile_url
                        SET u2.bio = $bio
                    MERGE (u1)-[:FOLLOWS]->(u2)
                    `,
                    {
                        mainUserId,
                        id: user.id,
                        name: user.name,
                        userName: user.userName,
                        profile_url: user.profile_url,
                        bio: user.bio 
                    }
                )
            );
        }
    } finally {
        await session.close();
    }
}

export async function getMutualFollowings(userName1: string, userName2: string): Promise<MutualFollowingsResponse> {
    const session = driver.session();

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
            userName: record.get('userName'),
            profile_url: record.get('profile_url'),
        }));

        return {
            mutuals,
            status: 'success',
        }
    } catch (error) {
        console.error(`Error fetching mutual followings: ${error}`);
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
    await driver.close();
}

export async function getUserLastFetched(userId: string): Promise<string | null> {
    const session = driver.session();
    try {
        const result = await session.executeRead(tx =>
            tx.run(
                `MATCH (u:User {id: $userId}) RETURN u.lastFetched as lastFetched`,
                { userId }
            )
        );
        if (result.records.length === 0) return null;
        return result.records[0].get(`lastFetched`) || null;
    } finally {
        await session.close();
    }
}

export async function ensureFreshFollowings(userId: string): Promise<void> {
    console.log(`[debug] ensureFreshFollowings called for ${userId}`);
    const lastFetched = await getUserLastFetched(userId);
    let needsSync = false;

    if (!lastFetched) {
        needsSync = true;
    } else {
        const last = new Date(lastFetched);
        const now = new Date();
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const ageDays = (now.getTime() - last.getTime()) / MS_PER_DAY;
        console.log(`[sync] ${userId} last fetched ${ageDays.toFixed(2)} days ago`);
        if (ageDays > TTL_DAYS) needsSync = true;
    }

    if (needsSync) {
        const allFollowings = await fetchAllFollowings(userId);
        await storeUsersinNeo4j(userId, allFollowings);
    }
}