import { fetchTwitterUserInfo } from "../src/twitter/fetchTwitterUserInfo";
import { TwitterUser } from "../src/twitter/fetchFollowings";

describe('fetchTwitterUserInfo', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        process.env.TWITTER_API_TOKEN = 'test-token';
    });

    it('return mapped user on success', async () => {
        const mockJson = {
            data: { userName: 'user1', name: 'Mock User', description: 'test description' },
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(mockJson),
        });

        const result = await fetchTwitterUserInfo('user1');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.twitterapi.io/twitter/user/info?userName=user1',
            {
                method: 'GET',
                headers: { 'x-api-key': 'test-token' },
            }
        );
        expect(result).toEqual<TwitterUser>({
            id: 'user1'.toLowerCase(),
            name: 'Mock User',
            profile_url: 'https://x.com/user1',
            bio: 'test description'
        });
    });

    it('returns null on non-ok HTTP response', async () => {
        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: jest.fn(),    // won't be called
        });

        const result = await fetchTwitterUserInfo('nonexistentuser');
        expect(result).toBeNull();
    });

    it('throws error when JSON status is error', async () => {
        const mockJson = {
            status: 'error',
            data: null,
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(mockJson),
        });

        await expect(fetchTwitterUserInfo('user1')).rejects.toThrow(
            'HTTP error 200 while fetching "user1"'
        );
    });

    it('throws error when data is missing in JSON', async () => {
        const mockJson = {
            status: 'success',
            data: null,
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(mockJson),
        });

        await expect(fetchTwitterUserInfo('user1')).rejects.toThrow(
            'No data received from TwitterAPI.io for user: "user1"'
        );
    });

    it('returns user with empty bio if description is missing', async () => {
        const mockJson = {
            status: 'success',
            data: { userName: 'user2', name: 'No Bio User' }, // No description
        };

        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(mockJson),
        });

        const result = await fetchTwitterUserInfo('user2');

        expect(result).toEqual<TwitterUser>({
            id: 'user2',
            name: 'No Bio User',
            profile_url: 'https://x.com/user2',
            bio: '',
        });
    });

    it('throws when fetch itself fails', async () => {
        (global as any).fetch = jest.fn().mockRejectedValue(new Error('Network Error'));

        await expect(fetchTwitterUserInfo('user1')).rejects.toThrow('Network Error');
    });
});