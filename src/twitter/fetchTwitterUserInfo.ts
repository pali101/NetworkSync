import dotenv from 'dotenv';
import { TwitterUser } from './fetchFollowings';
dotenv.config();

/**
 * Fetch a single user's info from the Twitter API.
 */
export async function fetchTwitterUserInfo(userName: string): Promise<TwitterUser | null> {
    const url = `https://api.twitterapi.io/twitter/user/info?userName=${userName}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-api-key': process.env.TWITTER_API_TOKEN || '',
        },
    });

    if (!response.ok) {
        console.warn(`Twitter API returned status ${response.status} for user "${userName}"`);
        return null;
    }

    const json: any = await response.json();

    if (json.status === 'error') {
        throw new Error(`HTTP error ${response.status} while fetching "${userName}"`);
    }

    if (!json.data) {
        throw new Error(`No data received from TwitterAPI.io for user: "${userName}"`);
    }

    const data = json.data;

    return {
        id: data.userName.toLowerCase(),
        name: data.name,
        profile_url: `https://x.com/${data.userName}`,
        bio: data.description || '',
    };
}