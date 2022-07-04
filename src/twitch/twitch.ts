const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); //initialize dotenv

import { ClientCredentialsAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';

async function init(): Promise<ApiClient> {
    const clientId = process.env.TWITCH_API_CLIENT_ID;
    const clientSecret = process.env.TWITCH_API_CLIENT_SECRET;
    const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);

    const apiClient = new ApiClient({ authProvider })

    return apiClient;
}

async function getVideoStartTimestamp(apiClient: ApiClient, videoId: string) {
    const video = await apiClient.videos.getVideoById(videoId);

    console.log(video.creationDate.getTime())

    return video.creationDate.getTime()
}

async function getVideoBroadcaster(apiClient: ApiClient, videoId: string) {
    const video = await apiClient.videos.getVideoById(videoId);

    console.log((await video.getUser()).displayName)

    return (await video.getUser()).displayName
}

export { init as initTwitch, getVideoStartTimestamp, getVideoBroadcaster }