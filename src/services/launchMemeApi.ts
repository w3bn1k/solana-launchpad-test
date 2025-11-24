import { launchMemeConfig } from '../config/launchMeme';
import tokensData from './tokens.json';

export type RawLaunchToken = {
    token: string;
    name: string;
    symbol: string;
    priceUsd?: number;
    priceSol?: number;
    marketCapUsd?: number;
    progress?: number;
    progressSol?: number;
    _balanceSol?: number;
    _balanceTokens?: number;
    holders?: number;
    description?: string | null;
    photo?: string | null;
    metadataUri?: string;
    mint_time?: number;
    volumeUsd?: number;
    volumeSol?: number;
    price?: number;
    [key: string]: unknown;
};

export type LaunchToken = {
    id: string;
    name: string;
    symbol: string;
    price: number;
    priceUsd: number;
    priceSol: number;
    liquidity: number;
    fdv: number;
    volume24h: number;
    progress: number;
    network: string;
    holders: number;
    iconUrl?: string;
    bannerUrl?: string;
    createdAt: string;
    isFallback?: boolean;
    raw?: RawLaunchToken;
};

export type LaunchOrderbookLevel = {
    price: number;
    amount: number;
    side: 'bid' | 'ask';
};

export type LaunchTrade = {
    id: string;
    price: number;
    amount: number;
    side: 'buy' | 'sell';
    wallet: string;
    timestamp: string;
};

export type LaunchMarketPulse = {
    activeTokens: number;
    tvl: number;
    participants: number;
    avgPrice: number;
    totalVolume: number;
    hotNetwork: string;
    updatedAt: string;
};

export type LaunchOrderPayload = {
    tokenId: string;
    amount: number;
    currency: 'SOL' | 'USDC';
    intent: 'market' | 'limit';
    slippageBps?: number;
    walletAddress: string;
};

const serviceTokens: LaunchToken[] = Object.values(tokensData.tokens).map(token => ({
    id: token.token,
    name: token.name,
    symbol: token.symbol,
    priceUsd: token.priceUsd ?? token.price ?? 0,
    priceSol: token.priceSol ?? 0,
    price: token.priceUsd ?? token.price ?? 0,
    liquidity: token._balanceSol ?? 0,
    fdv: token.marketCapUsd ?? 0,
    volume24h: token.volumeUsd ?? 0,
    progress: token.progress ?? 0,
    network: 'Solana',
    holders: token.holders ?? 0,
    iconUrl: token.photo ?? undefined,
    bannerUrl: token.metadataUri ?? undefined,
    createdAt: token.mint_time ? new Date(token.mint_time).toISOString() : new Date().toISOString(),
    raw: token
}));

const fallbackPulse: LaunchMarketPulse = {
    activeTokens: 123,
    tvl: 42_000_000,
    participants: 183_421,
    totalVolume: 123,
    avgPrice: 0.000123,
    hotNetwork: 'Solana',
    updatedAt: new Date().toISOString()
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), launchMemeConfig.restTimeoutMs);

    try {
        const response = await fetch(`${launchMemeConfig.apiBaseUrl}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${launchMemeConfig.wsToken}`,
                ...(init?.headers || {})
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Launch Meme API error ${response.status}`);
        }

        return (await response.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

type TokensResponse = {
    tokens: Record<string, RawLaunchToken>;
};

const mapToken = (raw: RawLaunchToken): LaunchToken => ({
    id: raw.token,
    name: raw.name,
    symbol: raw.symbol,
    priceUsd: raw.priceUsd ?? raw.price ?? 0,
    priceSol: raw.priceSol ?? 0,
    price: raw.priceUsd ?? raw.price ?? 0,
    liquidity: raw._balanceSol ?? 0,
    fdv: raw.marketCapUsd ?? 0,
    volume24h: raw.volumeUsd ?? 0,
    progress: raw.progress ?? 0,
    network: 'Solana',
    holders: raw.holders ?? 0,
    iconUrl: raw.photo ?? undefined,
    bannerUrl: raw.metadataUri ?? undefined,
    createdAt: raw.mint_time ? new Date(raw.mint_time).toISOString() : new Date().toISOString(),
    raw
});

async function postTokensRequest(body: Record<string, unknown>): Promise<LaunchToken[]> {
    const response = await request<TokensResponse>('/tokens', {
        method: 'POST',
        body: JSON.stringify(body)
    });
    if (!response?.tokens) {
        return [];
    }
    return Object.values(response.tokens).map(mapToken);
}

export async function fetchSpotlightTokens(page = 1, list = 'spotlight', version = 1): Promise<LaunchToken[]> {
    try {
        const tokens = await postTokensRequest({ page, list, version });
        return tokens.length ? tokens : serviceTokens;
    } catch (error) {
        console.warn('[launchmeme] service tokens', error);
        return serviceTokens;
    }
}

export async function fetchTokenDetail(tokenId: string): Promise<LaunchToken | undefined> {
    try {
        const [token] = await postTokensRequest({ id: tokenId });
        return token;
    } catch (error) {
        console.warn('[launchmeme] service token detail', error);
        return serviceTokens.find((token) => token.id === tokenId) ?? serviceTokens[0];
    }
}

export async function fetchMarketPulse(): Promise<LaunchMarketPulse> {
    try {
        const result = await request<{ data: LaunchMarketPulse }>('/pulse');
        return result.data;
    } catch (error) {
        console.warn('[launchmeme] fallback pulse', error);
        return fallbackPulse;
    }
}

export async function fetchOrderbook(tokenId: string): Promise<LaunchOrderbookLevel[]> {
    try {
        const result = await request<{ data: LaunchOrderbookLevel[] }>(`/tokens/${tokenId}/orderbook`);
        return result.data;
    } catch (error) {
        console.warn('[launchmeme] fallback orderbook', error);
        const token = serviceTokens.find((t) => t.id === tokenId) ?? serviceTokens[0];
        return Array.from({ length: 12 }).map((_, idx) => ({
            price: token.price * (1 + (idx - 6) * 0.002),
            amount: Math.random() * 80_000,
            side: idx < 6 ? 'bid' : 'ask'
        }));
    }
}

export async function fetchRecentTrades(tokenId: string): Promise<LaunchTrade[]> {
    try {
        const result = await request<{ data: LaunchTrade[] }>(`/tokens/${tokenId}/trades`);
        return result.data;
    } catch (error) {
        console.warn('[launchmeme] fallback trades', error);
        return Array.from({ length: 15 }).map((_, idx) => ({
            id: `${tokenId}-${idx}`,
            price: serviceTokens[0].price * (1 + (Math.random() - 0.5) * 0.01),
            amount: Math.random() * 45_000,
            side: Math.random() > 0.5 ? 'buy' : 'sell',
            wallet: `So111...${Math.random().toString(16).slice(2, 7)}`,
            timestamp: new Date(Date.now() - idx * 60_000).toISOString()
        }));
    }
}

export async function submitLaunchOrder(payload: LaunchOrderPayload): Promise<{ success: boolean; id?: string }> {
    try {
        const result = await request<{ data: { id: string } }>(`/orders`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return { success: Boolean(result?.data?.id), id: result?.data?.id };
    } catch (error) {
        console.warn('[launchmeme] order submission failed', error);
        return { success: false };
    }
}