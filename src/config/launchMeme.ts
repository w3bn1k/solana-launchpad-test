const getEnv = (key: string, fallback: string) => process.env[key] || fallback;

export const launchMemeConfig = {
    apiBaseUrl: getEnv('REACT_APP_LAUNCH_MEME_API', 'https://launch.meme/api'),
    wsUrl: getEnv('REACT_APP_LAUNCH_MEME_WS', 'wss://launch.meme/connection/websocket'),
    wsToken: getEnv('REACT_APP_LAUNCH_MEME_WS_TOKEN', ''),
    wsPrefix: getEnv('REACT_APP_LAUNCH_MEME_WS_PREFIX', 'pumpfun'),
    restTimeoutMs: 12000
};

export const isLaunchMemeConfigured = Boolean(launchMemeConfig.wsToken && launchMemeConfig.apiBaseUrl);

