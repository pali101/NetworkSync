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