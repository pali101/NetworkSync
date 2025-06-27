import { fetchFollowings } from "../src/twitter/fetchFollowings";

describe('fetchFollowings', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        process.env.TWITTER_API_TOKEN = 'test-token';
    });

    it('fetches followings without cursor and maps users correctly', async() => {
        const mockResponse = {
            followings: [
                { userName: 'UserOne', name: 'User One', description: 'Bio One' },
                { userName: 'UserTwo', name: 'User Two' },
            ],
            has_next_page: true,
            next_cursor: '20',
            status: 'success',
            msg: 'OK',
            code: 200
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await fetchFollowings('testUser');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.twitterapi.io/twitter/user/followings?pageSize=200&userName=testUser',
            {
                method: 'GET',
                headers: { 'x-api-key': 'test-token'},
            }
        );

        expect(result).toEqual({
            followings: [
                { id: 'userone', name: 'User One', profile_url: 'https://x.com/UserOne', bio: 'Bio One' },
                { id: 'usertwo', name: 'User Two', profile_url: 'https://x.com/UserTwo', bio: '' },
            ],
            has_next_page: true,
            next_cursor: '20',
            status: 'success',
            msg: 'OK',
            code: 200
        });
    });

    it('includes cursor in URL when provided', async () => {
        const mockResponse = {
            followings: [],
            has_next_page: false,
            next_cursor: null,
            status: 'success',
            msg: 'OK',
            code: 200
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        await fetchFollowings('testUser', '123');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.twitterapi.io/twitter/user/followings?pageSize=200&userName=testUser&cursor=123',
            expect.any(Object)
        );
    });

    it('returns error structure when fetch throws', async () => {
        const errorMessage = 'Network error';
        (global as any).fetch = jest.fn().mockRejectedValue(new Error(errorMessage));

        const result = await fetchFollowings('testUser');

        expect(result).toEqual({
            followings: [],
            has_next_page: false,
            next_cursor: undefined,
            status: 'error',
            msg: errorMessage,
            code: -1,
        })
    })
});