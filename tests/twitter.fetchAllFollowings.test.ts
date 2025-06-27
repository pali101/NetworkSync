import { fetchFollowings, TwitterUser, FollowingsResponse } from '../src/twitter/fetchFollowings';
import { fetchAllFollowings } from '../src/twitter/fetchAllFollowings';

jest.mock('../src/twitter/fetchFollowings');
const mockFetch = fetchFollowings as jest.MockedFunction<typeof fetchFollowings>;

describe('fetchAllFollowings', () => {
    beforeEach(() => {
        mockFetch.mockReset()
    });

    it('fetches multiple pages and concatenates results', async () => {
        const userPage1: TwitterUser[] = [
            { id: 'user1', name: 'User One', profile_url: 'url1', bio: 'bio1' }
        ];
        const userPage2: TwitterUser[] = [
            { id: 'user2', name: 'User Two', profile_url: 'url2', bio: 'bio2' }
        ];

        mockFetch.mockResolvedValueOnce({
            followings: userPage1,
            has_next_page: true,
            next_cursor: '1',
            status: 'success',
            msg: 'OK',
            code: 200
        } as FollowingsResponse)
        .mockResolvedValueOnce({
            followings: userPage2,
            has_next_page: false,
            next_cursor: undefined,
            status: 'success',
            msg: 'OK',
            code: 200
        } as FollowingsResponse);

        const result = await fetchAllFollowings('testUser');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(1, 'testUser', undefined);
        expect(mockFetch).toHaveBeenNthCalledWith(2, 'testUser', '1');
        expect(result).toEqual([...userPage1, ...userPage2]);
    });

    it('returns empty array when no followins and single page', async() => {
        mockFetch.mockResolvedValueOnce({
            followings: [],
            has_next_page: false,
            next_cursor: undefined,
            status: 'success',
            msg: 'OK',
            code: 200
        } as FollowingsResponse);

        const result = await fetchAllFollowings('testUser');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
    });

    it('throws an error when a page returns non-success status', async() => {
        mockFetch.mockResolvedValueOnce({
            followings: [],
            has_next_page: false,
            next_cursor: undefined,
            status: 'error',
            msg: 'Invalid user',
            code: 400,
        } as FollowingsResponse);

        await expect(fetchAllFollowings('testUser')).rejects.toThrow(
            'Twitter API error for "testUser" while fetching followings: Invalid user'
        );

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('testUser', undefined);
    });
});