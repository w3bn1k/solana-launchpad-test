import { create } from 'zustand';
import dayjs from 'dayjs';
import {
    fetchOrderbook,
    fetchRecentTrades,
    fetchTokenDetail,
    LaunchMarketPulse,
    LaunchOrderbookLevel,
    LaunchToken,
    LaunchTrade
} from '../services/launchMemeApi';
import { launchMemeStream, OrderbookUpdate, TradeStreamUpdate, TickerUpdate } from '../services/launchMemeStream';
import { queryClient } from '../lib/queryClient';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type PulseFeedItem = {
    id: string;
    message: string;
    timestamp: string;
    type: 'trade' | 'orderbook' | 'system';
};

type MarketsStore = {
    spotlight: LaunchToken[];
    selectedToken?: LaunchToken;
    pulse: LaunchMarketPulse | null;
    orderbook: LaunchOrderbookLevel[];
    trades: LaunchTrade[];
    streamStatus: StreamStatus;
    pulseFeed: PulseFeedItem[];
    isLoadingSnapshot: boolean;
    setSpotlight: (tokens: LaunchToken[]) => void;
    selectToken: (tokenId: string) => Promise<void>;
    connectStreams: () => void;
    disconnectStreams: () => void;
    refreshSelected: () => Promise<void>;
};

const MAX_TOKENS = 120;

const isFallbackToken = (token: LaunchToken) => Boolean(token.isFallback || token.raw?.isFallback);

const recalcPulse = (tokens: LaunchToken[]): LaunchMarketPulse | null => {
    if (!tokens.length) {
        return null;
    }

    const tvl = tokens.reduce((sum, token) => sum + (token.liquidity ?? 0), 0);
    const participants = tokens.reduce(
        (sum, token) => sum + (token.raw?.holders ?? token.score ?? 0),
        0
    );
    const avgApr =
        tokens.reduce((sum, token) => sum + (token.change24h ?? 0), 0) / tokens.length;

    return {
        tvl,
        participants,
        avgApr,
        hotNetwork: 'Solana',
        updatedAt: new Date().toISOString()
    };
};

const upsertToken = (list: LaunchToken[], token: LaunchToken): LaunchToken[] => {
    const index = list.findIndex((item) => item.id === token.id);
    if (index >= 0) {
        const next = [...list];
        next[index] = { ...next[index], ...token };
        return next;
    }
    const appended = [...list, token];
    return appended.length > MAX_TOKENS ? appended.slice(appended.length - MAX_TOKENS) : appended;
};

const pruneFallback = (tokens: LaunchToken[]) => {
    const hasReal = tokens.some((token) => !isFallbackToken(token));
    if (!hasReal) {
        return tokens;
    }
    return tokens.filter((token) => !isFallbackToken(token));
};

const syncQueryCache = (tokens: LaunchToken[]) => {
    queryClient.setQueryData(['tokens', 'spotlight'], tokens);
};

export const useMarketsStore = create<MarketsStore>((set, get) => ({
    spotlight: [],
    pulse: null,
    orderbook: [],
    trades: [],
    streamStatus: 'idle',
    pulseFeed: [],
    isLoadingSnapshot: true,

    setSpotlight: (tokens: LaunchToken[]) => {
        const sanitized = pruneFallback(tokens);
        set((state) => {
            const nextSelected =
                state.selectedToken && sanitized.some((token) => token.id === state.selectedToken?.id)
                    ? state.selectedToken
                    : sanitized[0] ?? state.selectedToken;
            return {
                spotlight: sanitized,
                selectedToken: nextSelected,
                pulse: recalcPulse(sanitized)
            };
        });
        syncQueryCache(sanitized);
    },

    selectToken: async (tokenId: string) => {
        const detail = await fetchTokenDetail(tokenId);
        set({ selectedToken: detail });
        await get().refreshSelected();
        launchMemeStream.subscribeOrderbook(tokenId);
    },

    refreshSelected: async () => {
        const token = get().selectedToken;
        if (!token) return;
        set({ isLoadingSnapshot: true });
        const [orderbook, trades] = await Promise.all([fetchOrderbook(token.id), fetchRecentTrades(token.id)]);
        set({ orderbook, trades, isLoadingSnapshot: false });
    },

    connectStreams: () => {
        const addPulseFeed = (type: PulseFeedItem['type'], message: string) => {
            set((state) => ({
                pulseFeed: [
                    {
                        id: `${type}-${Date.now()}`,
                        message,
                        type,
                        timestamp: dayjs().toISOString()
                    },
                    ...state.pulseFeed
                ].slice(0, 8)
            }));
        };

        launchMemeStream.connect({
            onStatusChange: (status) => set({ streamStatus: status }),
            onTicker: (ticker: TickerUpdate) => {
                set((state) => {
                    const updated = state.spotlight.map((token) =>
                        token.id === ticker.tokenId
                            ? {
                                ...token,
                                price: ticker.price,
                                priceUsd: ticker.price,
                                change24h: ticker.change24h,
                                volume24h: ticker.volume24h,
                                liquidity: ticker.liquidity ?? token.liquidity
                            }
                            : token
                    );
                    const sanitized = pruneFallback(updated);
                    syncQueryCache(sanitized);
                    return { spotlight: sanitized, pulse: recalcPulse(sanitized) };
                });
            },
            onTokenUpdate: (token) => {
                set((state) => {
                    const updated = pruneFallback(upsertToken(state.spotlight, token));
                    syncQueryCache(updated);
                    return { spotlight: updated, pulse: recalcPulse(updated) };
                });
            },
            onMint: (token) => {
                addPulseFeed('system', `🆕 Minted ${token.symbol}`);
                set((state) => {
                    const updated = pruneFallback(upsertToken(state.spotlight, token));
                    syncQueryCache(updated);
                    return { spotlight: updated, pulse: recalcPulse(updated) };
                });
            },
            onOrderbook: (update: OrderbookUpdate) => {
                const selected = get().selectedToken;
                if (!selected || selected.id !== update.tokenId) return;
                set({
                    orderbook: [...update.bids, ...update.asks]
                });
                addPulseFeed('orderbook', `Orderbook refresh ${selected.symbol}`);
            },
            onTrade: (trade: TradeStreamUpdate) => {
                const selected = get().selectedToken;
                if (!selected || selected.id !== trade.tokenId) return;
                set((state) => ({
                    trades: [trade, ...state.trades].slice(0, 50)
                }));
                addPulseFeed('trade', `${trade.side === 'buy' ? '🟢 Buy' : '🔴 Sell'} ${trade.amount.toFixed(0)} @ ${trade.price.toFixed(4)}`);
            }
        });

        launchMemeStream.subscribeGlobal();
    },

    disconnectStreams: () => {
        launchMemeStream.disconnect();
        set({ streamStatus: 'idle' });
    }
}));

