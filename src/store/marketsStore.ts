import { create } from 'zustand';
import dayjs from 'dayjs';
import {
    fetchMarketPulse,
    fetchOrderbook,
    fetchRecentTrades,
    fetchSpotlightTokens,
    fetchTokenDetail,
    LaunchMarketPulse,
    LaunchOrderbookLevel,
    LaunchToken,
    LaunchTrade
} from '../services/launchMemeApi';
import { launchMemeStream, OrderbookUpdate, TradeStreamUpdate, TickerUpdate } from '../services/launchMemeStream';

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
    hydrate: () => Promise<void>;
    selectToken: (tokenId: string) => Promise<void>;
    connectStreams: () => void;
    disconnectStreams: () => void;
    refreshSelected: () => Promise<void>;
};

export const useMarketsStore = create<MarketsStore>((set, get) => ({
    spotlight: [],
    pulse: null,
    orderbook: [],
    trades: [],
    streamStatus: 'idle',
    pulseFeed: [],
    isLoadingSnapshot: true,

    hydrate: async () => {
        set({ isLoadingSnapshot: true });
        const [tokens, pulse] = await Promise.all([fetchSpotlightTokens(), fetchMarketPulse()]);
        const selected = get().selectedToken ?? tokens[0];
        set({ spotlight: tokens, pulse, selectedToken: selected, isLoadingSnapshot: false });
        if (selected) {
            await get().refreshSelected();
            launchMemeStream.subscribeOrderbook(selected.id);
        }
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
                set((state) => ({
                    spotlight: state.spotlight.map((token) =>
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
                    )
                }));
            },
            onTokenUpdate: (token) => {
                set((state) => {
                    const exists = state.spotlight.some((item) => item.id === token.id);
                    return {
                        spotlight: exists
                            ? state.spotlight.map((item) => (item.id === token.id ? { ...item, ...token } : item))
                            : [token, ...state.spotlight]
                    };
                });
            },
            onMint: (token) => {
                addPulseFeed('system', `🆕 Minted ${token.symbol}`);
                set((state) => ({
                    spotlight: [token, ...state.spotlight].slice(0, 40)
                }));
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

