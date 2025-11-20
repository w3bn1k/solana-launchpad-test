import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { LaunchOrderbookLevel, LaunchToken, LaunchTrade } from '../../services/launchMemeApi';
import { PulseFeedItem, StreamStatus } from '../../store/marketsStore';
import './MarketTerminal.css';

type MarketTerminalProps = {
  token?: LaunchToken;
  orderbook: LaunchOrderbookLevel[];
  trades: LaunchTrade[];
  pulseFeed: PulseFeedItem[];
  streamStatus: StreamStatus;
  onRefreshSnapshot?: () => void;
  isLoading?: boolean;
};

const StreamBadge: React.FC<{ status: StreamStatus }> = ({ status }) => {
  const mapping: Record<StreamStatus, { label: string; color: string }> = {
    idle: { label: 'Idle', color: '#94a3b8' },
    connecting: { label: 'Connecting', color: '#fbbf24' },
    connected: { label: 'Live', color: '#34d399' },
    disconnected: { label: 'Reconnecting', color: '#f87171' },
    error: { label: 'Error', color: '#f43f5e' }
  };

  const data = mapping[status];

  return (
    <span className="market-terminal__stream-badge" style={{ color: data.color }}>
      <span className="ping-dot" style={{ background: data.color }} />
      {data.label}
    </span>
  );
};

const SkeletonSection: React.FC<{ rows?: number; variant?: 'chart' | 'list' }> = ({ rows = 4, variant = 'list' }) => {
  if (variant === 'chart') {
    return (
      <div className="chart-skeleton">
        <span className="skeleton-line" style={{ width: '85%' }} />
        <span className="skeleton-line" style={{ width: '60%' }} />
        <div className="chart-skeleton__grid" />
      </div>
    );
  }

  return (
    <div className="skeleton-block">
      {Array.from({ length: rows }).map((_, idx) => (
        <span
          key={idx}
          className="skeleton-line"
          style={{ width: `${Math.max(40, 80 - idx * 8)}%` }}
        />
      ))}
    </div>
  );
};

export const MarketTerminal: React.FC<MarketTerminalProps> = ({
  token,
  orderbook,
  trades,
  pulseFeed,
  streamStatus,
  onRefreshSnapshot,
  isLoading
}) => {
  const chartData = useMemo(
    () =>
      trades
        .slice(0, 40)
        .map((trade) => ({
          price: trade.price,
          amount: trade.amount,
          time: new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
        .reverse(),
    [trades]
  );

  const bids = orderbook.filter((level) => level.side === 'bid').slice(0, 10);
  const asks = orderbook.filter((level) => level.side === 'ask').slice(0, 10);

  return (
    <div className={`market-terminal ${isLoading ? 'market-terminal--loading' : ''}`}>
      <header className="market-terminal__header">
        {isLoading ? (
          <div className="market-terminal__header-skeleton">
            <span className="skeleton-line" style={{ width: '160px' }} />
            <span className="skeleton-line" style={{ width: '120px' }} />
          </div>
        ) : (
          <>
            <div>
              <p>Now trading</p>
              <h2>
                {token?.name} <span>{token?.symbol}</span>
              </h2>
            </div>
            <div className="market-terminal__actions">
              <button onClick={onRefreshSnapshot}>Snapshot</button>
              <StreamBadge status={streamStatus} />
            </div>
          </>
        )}
      </header>

      <div className="market-terminal__grid">
        <section className="market-terminal__chart">
          {isLoading ? (
            <>
              <div className="section-header">
                <div>
                  <span className="skeleton-line" style={{ width: '160px' }} />
                </div>
                <span className="skeleton-line" style={{ width: '80px' }} />
              </div>
              <div className="chart-wrapper chart-wrapper--skeleton">
                <SkeletonSection variant="chart" />
              </div>
            </>
          ) : (
            <>
              <div className="section-header">
                <div>
                  <p>Price action • 24h</p>
                  <strong>${token ? token.price.toFixed(4) : '0.0000'}</strong>
                </div>
                <div className={token && token.change24h >= 0 ? 'pill pill--up' : 'pill pill--down'}>
                  {token && token.change24h >= 0 ? '+' : ''}
                  {token ? token.change24h.toFixed(2) : '0.00'}%
                </div>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" width={70} />
                    <Tooltip
                      cursor={{ stroke: '#334155', strokeWidth: 1 }}
                      contentStyle={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: 12 }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#818cf8" fill="url(#priceGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section className="market-terminal__orderbook">
          {isLoading ? (
            <SkeletonSection rows={6} />
          ) : (
            <>
              <div className="section-header">
                <p>Orderbook depth</p>
                <span>{token?.symbol}</span>
              </div>
              <div className="orderbook-columns">
                <div>
                  <p>Bids</p>
                  <ul>
                    {bids.map((level, idx) => (
                      <li key={`bid-${idx}`}>
                        <span>${level.price.toFixed(4)}</span>
                        <span>{level.amount.toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p>Asks</p>
                  <ul>
                    {asks.map((level, idx) => (
                      <li key={`ask-${idx}`}>
                        <span>${level.price.toFixed(4)}</span>
                        <span>{level.amount.toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="market-terminal__trades">
          {isLoading ? (
            <SkeletonSection rows={8} />
          ) : (
            <>
              <div className="section-header">
                <p>Live fills</p>
                <span>Last {trades.length}</span>
              </div>
              <ul>
                {trades.slice(0, 12).map((trade) => (
                  <li key={trade.id}>
                    <span className={trade.side === 'buy' ? 'pill pill--up' : 'pill pill--down'}>{trade.side}</span>
                    <span>${trade.price.toFixed(4)}</span>
                    <span>{trade.amount.toFixed(0)}</span>
                    <span>{new Date(trade.timestamp).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="market-terminal__pulse">
          {isLoading ? (
            <SkeletonSection rows={5} />
          ) : (
            <>
              <div className="section-header">
                <p>Pulses</p>
                <span>Realtime feed</span>
              </div>
              <div className="pulse-feed">
                {pulseFeed.map((item) => (
                  <article key={item.id} className={`pulse-feed__item pulse-feed__item--${item.type}`}>
                    <p>{item.message}</p>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

