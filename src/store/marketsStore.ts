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

const recalcPulse = (tokens: LaunchToken[]): LaunchMarketPulse | null => {
    if (!tokens.length) {
        return null;
    }

    const activeTokens = tokens.length;

    const tvl = tokens.reduce((sum, token) => sum + (token.liquidity ?? 0), 0);
    const participants = tokens.reduce(
        (sum, token) => sum + (token.raw?.holders ?? token.holders ?? 0),
        0
    );

    const activeTokenPrices = tokens
        .filter(token => (token.volume24h ?? 0) > 100)
        .map(token => token.priceUsd ?? 0);

    const avgPrice = activeTokenPrices.length > 0
        ? activeTokenPrices.reduce((sum, price) => sum + price, 0) / activeTokenPrices.length
        : tokens.reduce((sum, token) => sum + (token.priceUsd ?? 0), 0) / tokens.length;

    const totalVolume = tokens.reduce((sum, token) => sum + (token.volume24h ?? 0), 0);

    return {
        activeTokens,
        tvl: parseFloat(tvl.toFixed(2)),
        participants,
        avgPrice: parseFloat(avgPrice.toFixed(6)),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        hotNetwork: 'Solana',
        updatedAt: new Date().toISOString()
    };
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

        const generateTokenUpdates = (tokens: LaunchToken[]): any[] => {
            return tokens.map(token => {
                const priceChange = (Math.random() - 0.5) * 0.01;
                const volumeChange = (Math.random() - 0.5) * 0.06;
                const progressChange = (Math.random() - 0.5) * 0.008;

                let holdersChange = 0;
                if (Math.random() > 0.6) {
                    holdersChange = Math.random() > 0.5 ? 1 : -1;
                }

                const liquidityChange = (Math.random() - 0.5) * 0.008;

                const newPrice = Math.max(0.000001, token.priceUsd * (1 + priceChange));
                const newVolume = Math.max(10, token.volume24h * (1 + volumeChange));
                const newProgress = Math.max(0, Math.min(100, token.progress + progressChange));
                const newHolders = Math.max(1, token.holders + holdersChange);
                const newLiquidity = Math.max(0, token.liquidity * (1 + liquidityChange));

                return {
                    ...token,
                    priceUsd: parseFloat(newPrice.toFixed(8)),
                    price: parseFloat(newPrice.toFixed(8)),
                    volume24h: parseFloat(newVolume.toFixed(2)),
                    progress: parseFloat(newProgress.toFixed(2)),
                    holders: newHolders,
                    liquidity: parseFloat(newLiquidity.toFixed(2)),
                    fdv: parseFloat((newPrice * 1000000).toFixed(2)),
                    raw: {
                        ...token.raw,
                        priceUsd: parseFloat(newPrice.toFixed(8)),
                        volumeUsd: parseFloat(newVolume.toFixed(2)),
                        progress: parseFloat(newProgress.toFixed(2)),
                        holders: newHolders,
                        _balanceSol: parseFloat(newLiquidity.toFixed(2))
                    }
                };
            });
        };

        const updateMarketData = () => {
            set((state) => {
                if (!state.spotlight.length) {
                    return { pulse: null };
                }

                const updatedTokens = generateTokenUpdates(state.spotlight);
                const newPulse = recalcPulse(updatedTokens);

                return {
                    spotlight: updatedTokens,
                    pulse: newPulse
                };
            });
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
                                volume24h: ticker.volume24h ?? token.volume24h,
                                liquidity: ticker.liquidity ?? token.liquidity,
                                fdv: ticker.price * 1000000
                            }
                            : token
                    );
                    const sanitized = pruneFallback(updated);
                    syncQueryCache(sanitized);

                    const newPulse = recalcPulse(sanitized);
                    return {
                        spotlight: sanitized,
                        pulse: newPulse
                    };
                });
            },
            onTokenUpdate: (token) => {
                set((state) => {
                    const updated = state.spotlight.map((existingToken) => {
                        if (existingToken.id === token.id) {
                            const merged: LaunchToken = {
                                ...existingToken,
                                name: token.name ?? existingToken.name,
                                symbol: token.symbol ?? existingToken.symbol,
                                priceUsd: token.priceUsd !== undefined && token.priceUsd !== null
                                    ? token.priceUsd
                                    : existingToken.priceUsd,
                                priceSol: token.priceSol !== undefined && token.priceSol !== null
                                    ? token.priceSol
                                    : existingToken.priceSol,
                                price: token.priceUsd !== undefined && token.priceUsd !== null
                                    ? token.priceUsd
                                    : (token.price !== undefined && token.price !== null
                                        ? token.price
                                        : existingToken.price),
                                volume24h: token.volume24h !== undefined && token.volume24h !== null
                                    ? token.volume24h
                                    : existingToken.volume24h,
                                liquidity: token.liquidity !== undefined && token.liquidity !== null
                                    ? token.liquidity
                                    : existingToken.liquidity,
                                fdv: token.fdv !== undefined && token.fdv !== null
                                    ? token.fdv
                                    : existingToken.fdv,
                                progress: token.progress !== undefined && token.progress !== null
                                    ? token.progress
                                    : existingToken.progress,
                                holders: token.holders !== undefined && token.holders !== null
                                    ? token.holders
                                    : existingToken.holders,
                                iconUrl: token.iconUrl ?? existingToken.iconUrl,
                                bannerUrl: token.bannerUrl ?? existingToken.bannerUrl,
                                network: token.network ?? existingToken.network,
                                createdAt: token.createdAt ?? existingToken.createdAt,
                                raw: token.raw || existingToken.raw
                            };
                            return merged;
                        }
                        return existingToken;
                    });

                    const tokenExists = updated.some(t => t.id === token.id);
                    const finalList = tokenExists
                        ? updated
                        : [...updated, token];

                    const sanitized = pruneFallback(finalList);
                    syncQueryCache(sanitized);

                    const newPulse = recalcPulse(sanitized);
                    return {
                        spotlight: sanitized,
                        pulse: newPulse
                    };
                });
            },
            onMint: (token) => {
                addPulseFeed('system', `🆕 Minted ${token.symbol}`);
                set((state) => {
                    const updated = pruneFallback(upsertToken(state.spotlight, token));
                    syncQueryCache(updated);
                    const newPulse = recalcPulse(updated);
                    return {
                        spotlight: updated,
                        pulse: newPulse
                    };
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

        const dataInterval = setInterval(updateMarketData, 2000);

        launchMemeStream.subscribeGlobal();

        return () => {
            clearInterval(dataInterval);
        };
    },

    disconnectStreams: () => {
        launchMemeStream.disconnect();
        set({ streamStatus: 'idle' });
    }
}));

