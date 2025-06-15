import dotenv from 'dotenv';
import { fetchAllFollowings } from './twitter';
import { storeUsersinNeo4j, getMutualFollowings, ensureFreshFollowings } from './neo4j';

dotenv.config();

async function syncFollowings(userName: string) {
    console.log(`Fetching all following for: ${userName}`);
    const allFollowings = await fetchAllFollowings(userName);

    await storeUsersinNeo4j(userName, allFollowings);
    console.log(`Successfully stored ${allFollowings.length} followings in Neo4j.`);
}

const main = async () => {
    try {
        const task = process.argv[2];
        const arg1 = process.argv[3];
        const arg2 = process.argv[4];

        switch (task) {
            case 'fetch':
                if (!arg1) {
                    console.log('Usage: fetch <twitterUsername>');
                    process.exit(1);
                }
                console.log(`Fetching followings for: ${arg1}`);
                const allFollowings = await fetchAllFollowings(arg1);
                break;

            case 'mutual':
                if (!arg1 || !arg2) {
                    console.error(`Usage: mutual <username1> <username2>`);
                    process.exit(1);
                }
                console.log(`[debug] Ensuring fresh data for ${arg1} and ${arg2}`);
                await ensureFreshFollowings(arg1);
                await ensureFreshFollowings(arg2);

                const mutuals = await getMutualFollowings(arg1, arg2);
                console.log(`Mutual followings (${arg1} and ${arg2}):`);
                console.log(mutuals);
                break;

            case 'sync':
                if (!arg1) {
                    console.log(`Usage: sync <twitterUsername`);
                    process.exit(1);
                }
                await syncFollowings(arg1);
                break;

            default:
                console.log('Usage:');
                console.log('  fetch <twitterUsername>      - Fetch followings');
                console.log('  mutual <user1> <user2>       - Get mutual followings');
                console.log('  sync <twitterUsername>       - Fetch followings and store in Neo4j db');
                process.exit(1);
            }
            process.exit(0);
        } catch (error) {
            console.error(`Unexpected error:`, error);
            process.exit(1);
        }

    // MATCH (u1:User {id: 'shady535'})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(u2:User {id: 'HC_Protocol'})
    // RETURN common.id AS id, common.name AS name, common.userName AS userName, common.profile_url AS profile_url
};

main();