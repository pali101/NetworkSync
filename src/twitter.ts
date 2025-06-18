import dotenv from 'dotenv';
dotenv.config();

export interface TwitterUser {
    id: string;
    name: string;
    userName: string;
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
            id: user.id,
            name: user.name,
            userName: user.userName,
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
            console.error(`API error: ${response.msg}`);
            break;
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