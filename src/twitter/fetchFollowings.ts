import logger from '../logger';
import dotenv from 'dotenv';
dotenv.config();

export interface TwitterUser {
    id: string;
    name: string;
    profile_url: string;
    bio: string;
}

export interface FollowingsResponse {
    followings: TwitterUser[];
    has_next_page: boolean;
    next_cursor?: string;
    status: string;
    msg: string;
    code: number;
}

export async function fetchFollowings(userName: string, cursor?: string): Promise<FollowingsResponse> {
    logger.info(`Starting to fetch followings for user "${userName}"${cursor ? ` with cursor: ${cursor}` : ''}`);
    
    let url = `https://api.twitterapi.io/twitter/user/followings?pageSize=200&userName=${userName}`;
    if (cursor) url += `&cursor=${cursor}`;

    logger.info(`Making API request to: ${url}`);

    try {
        const response = await fetch (url, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TWITTER_API_TOKEN || '',
            },
        });

        if (!response.ok) {
            logger.warn(`API request failed with status ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json: any = await response.json();
        
        // Check API response status
        if (json.status !== 'success') {
            logger.warn(`API returned non-success status: ${json.status}, message: ${json.msg}`);
        }
        
        logger.info(`Received ${json.followings?.length || 0} followings from TwitterAPI.io for user "${userName}"`);

        if (!json.followings || !Array.isArray(json.followings)) {
            logger.warn(`Invalid or missing followings data in API response for user "${userName}"`);
        }

        const mappedFollowers: TwitterUser[] = (json.followings || []).map((user: any) => {
            if (!user.userName) {
                logger.warn(`Following user missing userName field: ${JSON.stringify(user)}`);
            }
            return {
                id: user.userName?.toLowerCase() || '',
                name: user.name || '',
                profile_url: `https://x.com/${user.userName || ''}`,
                bio: user.description || '',
            };
        });

        logger.info(`Successfully mapped ${mappedFollowers.length} followings for user "${userName}"`);
        
        if (json.has_next_page) {
            logger.info(`More pages available for user "${userName}" with cursor: ${json.next_cursor}`);
        } else {
            logger.info(`Reached last page for user "${userName}"`);
        }

        return {
            followings: mappedFollowers,
            has_next_page: json.has_next_page,
            next_cursor: json.next_cursor,
            status: json.status,
            msg: json.msg,
            code: json.code,
        }
    } catch (error) {
        logger.error(`Error fetching followings for user "${userName}":`, error);

        if (error instanceof TypeError && error.message.includes('fetch')) {
            logger.error(`Network error - check internet connection and API endpoint availability`);
        }

        return {
            followings: [],
            has_next_page: false,
            next_cursor: undefined,
            status: 'error',
            msg: (error as Error).message,
            code: -1,
        }
    }
}