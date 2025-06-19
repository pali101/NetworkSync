import dotenv from 'dotenv';
dotenv.config();

export interface TwitterUser {
    id: string;
    name: string;
    profile_url: string;
    bio: string;
}

interface FollowingsResponse {
    followings: TwitterUser[];
    has_next_page: boolean;
    next_cursor?: string;
    status: string;
    msg: string;
    code: number;
}

export async function fetchFollowings(userName: string, cursor?: string): Promise<FollowingsResponse> {
    let url = `https://api.twitterapi.io/twitter/user/followings?pageSize=200&userName=${userName}`;
    if (cursor) url += `&cursor=${cursor}`;

    try {
        const response = await fetch (url, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TWITTER_API_TOKEN || '',
            },
        });

        const json: any = await response.json();
        console.log(`Received ${json.followings?.length || 0} followings from TwitterAPI.io`);

        const mappedFollowers: TwitterUser[] = (json.followings || []).map((user: any) => ({
            id: user.userName.toLowerCase(),
            name: user.name,
            profile_url: `https://x.com/${user.userName}`,
            bio: user.description || '',
        }));

        // console.log(mappedFollowers);

        return {
            followings: mappedFollowers,
            has_next_page: json.has_next_page,
            next_cursor: json.next_cursor,
            status: json.status,
            msg: json.msg,
            code: json.code,
        }
    } catch (error) {
        console.error('Fetch error:', error);

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

export async function fetchAllFollowings(userName: string): Promise<TwitterUser[]> {
    let allFollowings: TwitterUser[] = [];
    let cursor: string | undefined = undefined;
    let page = 1;

    while (true) {
        console.log(`Fetching page ${page}...`);
        const response = await fetchFollowings(userName, cursor);

        if (response.status !== 'success') {
            const errorMsg = `Twitter API error for "${userName}" while fetching followings: ${response.msg}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        allFollowings = allFollowings.concat(response.followings);
        if (!response.has_next_page || !response.next_cursor) {
            break;
        }

        cursor = response.next_cursor;
        page++;
    }

    console.log(`Fetch total ${allFollowings.length} following.`);
    return allFollowings;
}

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

    if (json.status === 'error' || !json.data) {
        throw new Error(`HTTP error ${response.status} while fetching "${userName}"`);
    }

    const data = json.data;

    return {
        id: data.userName.toLowerCase(),
        name: data.name,
        profile_url: `https://x.com/${data.userName}`,
        bio: data.description || '',
    };
}