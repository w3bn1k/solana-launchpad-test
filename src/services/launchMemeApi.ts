import { launchMemeConfig } from '../config/launchMeme';

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
    change24h?: number;
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
    change24h: number;
    liquidity: number;
    fdv: number;
    volume24h: number;
    progress: number;
    network: string;
    score: number;
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
    tvl: number;
    participants: number;
    avgApr: number;
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

const fallbackTokens: LaunchToken[] = [
    {
        id: 'vibe-001',
        name: 'Vibe Chain',
        symbol: 'VIBE',
        price: 0.023,
        priceUsd: 0.023,
        priceSol: 0.023 / 180,
        change24h: 12.4,
        liquidity: 125_000,
        fdv: 4_500_000,
        volume24h: 890_000,
        progress: 64,
        network: 'Solana',
        score: 92,
        bannerUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
        createdAt: new Date().toISOString(),
        isFallback: true,
        raw: {
            token: 'vibe-001',
            name: 'Vibe Chain',
            symbol: 'VIBE',
            priceUsd: 0.023,
            _balanceSol: 125_000,
            holders: 92,
            metadataUri: '',
            photo: null,
            isFallback: true
        } as RawLaunchToken
    },
    {
        id: 'meme-777',
        name: 'Neon Cat',
        symbol: 'NEON',
        price: 0.0042,
        priceUsd: 0.0042,
        priceSol: 0.0042 / 180,
        change24h: -3.1,
        liquidity: 87_000,
        fdv: 1_230_000,
        volume24h: 410_000,
        progress: 38,
        network: 'Solana',
        score: 81,
        bannerUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
        createdAt: new Date().toISOString(),
        isFallback: true,
        raw: {
            token: 'meme-777',
            name: 'Neon Cat',
            symbol: 'NEON',
            priceUsd: 0.0042,
            _balanceSol: 87_000,
            holders: 81,
            metadataUri: '',
            photo: null,
            isFallback: true
        } as RawLaunchToken
    },
    {
        id: 'pulse-404',
        name: 'Quantum Pepe',
        symbol: 'QPEPE',
        price: 0.000093,
        priceUsd: 0.000093,
        priceSol: 0.000093 / 180,
        change24h: 28.7,
        liquidity: 210_000,
        fdv: 6_750_000,
        volume24h: 1_800_000,
        progress: 92,
        network: 'Solana',
        score: 97,
        bannerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80',
        createdAt: new Date().toISOString(),
        isFallback: true,
        raw: {
            token: 'pulse-404',
            name: 'Quantum Pepe',
            symbol: 'QPEPE',
            priceUsd: 0.000093,
            _balanceSol: 210_000,
            holders: 97,
            metadataUri: '',
            photo: null,
            isFallback: true
        } as RawLaunchToken
    }
];

const fallbackPulse: LaunchMarketPulse = {
    tvl: 42_000_000,
    participants: 183_421,
    avgApr: 38,
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
    change24h: raw.change24h ?? 0,
    liquidity: raw._balanceSol ?? 0,
    fdv: raw.marketCapUsd ?? 0,
    volume24h: raw.volumeUsd ?? 0,
    progress: raw.progress ?? 0,
    network: 'Solana',
    score: raw.holders ?? 0,
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
        return tokens.length ? tokens : fallbackTokens;
    } catch (error) {
        console.warn('[launchmeme] fallback tokens', error);
        return fallbackTokens;
    }
}

export async function fetchTokenDetail(tokenId: string): Promise<LaunchToken | undefined> {
    try {
        const [token] = await postTokensRequest({ id: tokenId });
        return token;
    } catch (error) {
        console.warn('[launchmeme] fallback token detail', error);
        return fallbackTokens.find((token) => token.id === tokenId) ?? fallbackTokens[0];
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
        const token = fallbackTokens.find((t) => t.id === tokenId) ?? fallbackTokens[0];
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
            price: fallbackTokens[0].price * (1 + (Math.random() - 0.5) * 0.01),
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

