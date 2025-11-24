import { Centrifuge, PublicationContext, Subscription } from 'centrifuge';
import { launchMemeConfig } from '../config/launchMeme';
import { LaunchOrderbookLevel, LaunchToken, LaunchTrade } from './launchMemeApi';
import { mapTokenFromStream } from './launchMemeStreamMapper';

export type TickerUpdate = {
    tokenId: string;
    price: number;
    volume24h: number;
    liquidity?: number;
};

export type OrderbookUpdate = {
    tokenId: string;
    bids: LaunchOrderbookLevel[];
    asks: LaunchOrderbookLevel[];
};

export type TradeStreamUpdate = LaunchTrade & { tokenId: string };

export type LaunchMemeStreamCallbacks = {
    onTicker?: (ticker: TickerUpdate) => void;
    onOrderbook?: (orderbook: OrderbookUpdate) => void;
    onTrade?: (trade: TradeStreamUpdate) => void;
    onTokenUpdate?: (token: LaunchToken) => void;
    onMint?: (token: LaunchToken) => void;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
};

class LaunchMemeStream {
    private centrifuge?: Centrifuge;
    private callbacks: LaunchMemeStreamCallbacks = {};
    private connectedToken?: string;
    private subscriptions: Record<string, Subscription> = {};
    private prefix = launchMemeConfig.wsPrefix;
    private activeTradeChannel?: string;

    connect(callbacks: LaunchMemeStreamCallbacks) {
        if (!launchMemeConfig.wsToken) {
            console.warn('LaunchMemeStream missing ws token');
            return;
        }

        this.callbacks = callbacks;

        if (this.centrifuge) {
            this.centrifuge.disconnect();
        }

        this.centrifuge = new Centrifuge(launchMemeConfig.wsUrl, {
            token: launchMemeConfig.wsToken
        });

        this.centrifuge.on('connecting', () => this.callbacks.onStatusChange?.('connecting'));
        this.centrifuge.on('connected', () => this.callbacks.onStatusChange?.('connected'));
        this.centrifuge.on('disconnected', () => this.callbacks.onStatusChange?.('disconnected'));
        this.centrifuge.on('error', () => this.callbacks.onStatusChange?.('error'));

        this.centrifuge.connect();
    }

    subscribeGlobal() {
        if (!this.centrifuge) return;

        this.subscribeToChannel('tokenUpdates', (ctx: PublicationContext) => {
            const data = ctx.data as any;

            if (process.env.NODE_ENV === 'development') {
                console.log('[WebSocket] tokenUpdates received:', {
                    token: data?.token,
                    progress: data?.progress,
                    volumeUsd: data?.volumeUsd
                });
            }

            const token = mapTokenFromStream(data);

            if (token) {
                this.callbacks.onTokenUpdate?.(token);
            }

            if (data?.token && (data?.priceUsd !== undefined || data?.price !== undefined)) {
                this.callbacks.onTicker?.({
                    tokenId: data.token,
                    price: data.priceUsd ?? data.price ?? 0,
                    volume24h: data.volumeUsd ?? data.volume24h ?? 0,
                    liquidity: data._balanceSol ?? data.liquidity
                });
            }
        });

        this.subscribeToChannel('mintTokens', (ctx: PublicationContext) => {
            const token = mapTokenFromStream(ctx.data);
            if (token) {
                this.callbacks.onMint?.(token);
            }
        });
    }

    subscribeOrderbook(tokenId: string) {
        if (!this.centrifuge) {
            return;
        }

        if (this.connectedToken === tokenId) return;
        this.connectedToken = tokenId;

        const tradesChannel = `txs_${tokenId}`;

        if (this.activeTradeChannel && this.activeTradeChannel !== tradesChannel) {
            this.unsubscribeChannel(this.activeTradeChannel);
        }
        this.activeTradeChannel = tradesChannel;

        this.subscribeToChannel(tradesChannel, (ctx: PublicationContext) => {
            this.callbacks.onTrade?.(ctx.data as TradeStreamUpdate);
        });
    }

    private subscribeToChannel(channel: string, handler: (ctx: PublicationContext) => void) {
        if (!this.centrifuge || this.subscriptions[channel]) {
            return;
        }

        const channelName = this.prefix ? `${this.prefix}-${channel}` : channel;
        const subscription = this.centrifuge.newSubscription(channelName);
        subscription.on('publication', handler);
        subscription.subscribe();
        this.subscriptions[channel] = subscription;
    }

    private unsubscribeChannel(channel: string) {
        const sub = this.subscriptions[channel];
        if (sub) {
            sub.unsubscribe();
            delete this.subscriptions[channel];
        }
    }

    disconnect() {
        this.centrifuge?.disconnect();
        this.centrifuge = undefined;
        this.connectedToken = undefined;
        Object.keys(this.subscriptions).forEach((channel) => {
            this.unsubscribeChannel(channel);
        });
        this.activeTradeChannel = undefined;
    }
}

export const launchMemeStream = new LaunchMemeStream();