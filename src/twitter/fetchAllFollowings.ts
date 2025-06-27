import { fetchFollowings, TwitterUser } from "./fetchFollowings";

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