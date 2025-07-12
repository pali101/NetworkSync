import { fetchFollowings, TwitterUser } from "./fetchFollowings";
import logger from "../logger";

export async function fetchAllFollowings(userName: string): Promise<TwitterUser[]> {
    logger.info(`Starting to fetch all followings for user "${userName}"`);
    const startTime = Date.now();
    
    let allFollowings: TwitterUser[] = [];
    let cursor: string | undefined = undefined;
    let page = 1;

    while (true) {
        logger.info(`Fetching page ${page} for user "${userName}"...`);
        const response = await fetchFollowings(userName, cursor);

        if (response.status !== 'success') {
            const errorMsg = `Twitter API error for "${userName}" while fetching followings: ${response.msg}`;
            logger.error({userName, page, msg: response.msg, error: errorMsg});
            throw new Error(errorMsg);
        }

        logger.info(`Successfully fetched page ${page} for user "${userName}" - received ${response.followings.length} followings`);
        
        if (response.followings.length === 0) {
            logger.warn(`Page ${page} returned 0 followings for user "${userName}" - this might be unexpected`);
        }

        allFollowings = allFollowings.concat(response.followings);
        
        if (!response.has_next_page || !response.next_cursor) {
            logger.info(`Reached end of followings for user "${userName}" at page ${page}`);
            break;
        }

        if (page > 10) {
            logger.warn(`User "${userName}" has many followings - currently on page ${page}. Total so far: ${allFollowings.length}`);
        }

        cursor = response.next_cursor;
        page++;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.info(`Successfully fetched ${allFollowings.length} followings for user "${userName}" in ${duration}ms across ${page} pages`);
    
    if (allFollowings.length === 0) {
        logger.warn(`No followings found for user "${userName}" - this might indicate the user has no followings or privacy restrictions`);
    }
    
    return allFollowings;
}