import dotenv from 'dotenv';
import { TwitterUser } from './fetchFollowings';
import logger from '../logger';

dotenv.config();

/**
 * Fetch a single user's info from the Twitter API.
 */
export async function fetchTwitterUserInfo(userName: string): Promise<TwitterUser | null> {
    logger.info(`Starting to fetch user info for: "${userName}"`);

    const url = `https://api.twitterapi.io/twitter/user/info?userName=${userName}`;
    logger.info(`Making request to: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TWITTER_API_TOKEN || '',
            },
        });

        if (!response.ok) {
            logger.error(`Failed to fetch user info for "${userName}": HTTP ${response.status}`);
            logger.warn(`API request failed with status: ${response.status} for user: "${userName}"`);
            return null;
        }

        logger.info(`Successfully received response for user: "${userName}"`);
        const json: any = await response.json();

        if (json.status === 'error') {
            logger.error(`Error fetching user info for "${userName}": ${json.msg}`);
            throw new Error(`HTTP error ${response.status} while fetching "${userName}"`);
        }

        if (!json.data) {
            logger.error(`No data received for user "${userName}"`);
            logger.warn(`API returned empty data for user: "${userName}"`);
            throw new Error(`No data received from TwitterAPI.io for user: "${userName}"`);
        }

        logger.info(`Successfully parsed user data for: "${userName}"`);
        const data = json.data;

        const userInfo = {
            id: data.userName.toLowerCase(),
            name: data.name,
            profile_url: `https://x.com/${data.userName}`,
            bio: data.description || '',
        };

        logger.info(`Successfully fetched user info for: "${userName}" (ID: ${userInfo.id})`);
        return userInfo;
    } catch (error) {
        logger.error(`Exception occurred while fetching user info for "${userName}": ${error}`);
        throw error;
    }
}