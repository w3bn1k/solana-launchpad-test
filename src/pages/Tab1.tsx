import React, { useEffect, useMemo } from 'react';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { refresh, sparkles } from 'ionicons/icons';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolana } from '../context/SolanaContext';
import { useSpotlightTokens } from '../hooks/useSpotlightTokens';
import { LaunchToken } from '../services/launchMemeApi';
import { usePrivySolana } from '../hooks/usePrivySolana';
import { useMarketsStore } from '../store/marketsStore';
import './Tab1.css';

const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...options }).format(value);

const Tab1: React.FC = () => {
  const { sdk } = useSolana();
  usePrivySolana();

  const {
    data: spotlightTokens = [],
    isLoading,
    isFetching,
    refetch
  } = useSpotlightTokens();

  const tokens = useMarketsStore((state) => state.spotlight);
  const setSpotlight = useMarketsStore((state) => state.setSpotlight);
  const connectStreams = useMarketsStore((state) => state.connectStreams);
  const disconnectStreams = useMarketsStore((state) => state.disconnectStreams);

  useEffect(() => {
    connectStreams();
    return () => disconnectStreams();
  }, [connectStreams, disconnectStreams]);

  useEffect(() => {
    if (spotlightTokens.length) {
      setSpotlight(spotlightTokens);
    }
  }, [spotlightTokens, setSpotlight]);

  const pools = tokens.length ? tokens : spotlightTokens;

  const summary = useMemo(() => {
    if (!pools.length) {
      return {
        totalLiquiditySol: 0,
        totalVolumeUsd: 0,
        avgProgress: 0,
        avgChange: 0,
        totalHolders: 0
      };
    }

    const totalLiquiditySol = pools.reduce((sum, token) => sum + (token.liquidity ?? 0), 0);
    const totalVolumeUsd = pools.reduce((sum, token) => sum + (token.volume24h ?? 0), 0);
    const avgProgress =
      pools.reduce((sum, token) => sum + (token.progress ?? 0), 0) / pools.length;
    const avgChange =
      pools.reduce((sum, token) => sum + (token.change24h ?? 0), 0) / pools.length;
    const totalHolders = pools.reduce(
      (sum, token) => sum + (token.raw?.holders ?? token.score ?? 0),
      0
    );

    return {
      totalLiquiditySol,
      totalVolumeUsd,
      avgProgress,
      avgChange,
      totalHolders
    };
  }, [pools]);

  const isBootstrapping = isLoading && !pools.length;

  const leaders = useMemo(() => {
    return pools
      .slice()
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, 6);
  }, [pools]);

  const lastUpdated = useMemo(() => {
    if (!pools.length) return null;
    const latest = pools
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? Date.now()).getTime() -
          new Date(a.createdAt ?? Date.now()).getTime()
      )[0];
    return latest
      ? new Date(latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
  }, [pools]);

  const currentNetwork = sdk.wallet.getCurrentNetwork();

  const metricCards = [
    {
      label: 'Active tokens',
      value: tokens.length ? tokens.length.toLocaleString() : '—',
      sublabel: 'Spotlight list'
    },
    {
      label: 'Total liquidity (◎)',
      value: summary.totalLiquiditySol
        ? formatNumber(summary.totalLiquiditySol, { maximumFractionDigits: 0 })
        : '—',
      sublabel: 'Across spotlight pools'
    },
    {
      label: '24h volume (USD)',
      value: summary.totalVolumeUsd
        ? `$${formatNumber(summary.totalVolumeUsd, { maximumFractionDigits: 0 })}`
        : '—',
      sublabel: 'Reported by API'
    },
    {
      label: 'Avg. progress',
      value: `${summary.avgProgress ? summary.avgProgress.toFixed(1) : '0.0'}%`,
      sublabel: 'Towards pump.fun migration'
    },
    {
      label: 'Avg. change',
      value: `${summary.avgChange ? summary.avgChange.toFixed(2) : '0.00'}%`,
      sublabel: 'Rolling 24h'
    },
    {
      label: 'Total holders',
      value: summary.totalHolders ? summary.totalHolders.toLocaleString() : '—',
      sublabel: 'Approximate wallet count'
    }
  ];

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar color="transparent">
          <IonTitle>Launch.Meme Telemetry</IonTitle>
          <IonButtons slot="end" className="wallet-toolbar-actions">
            <IonChip color="primary">{currentNetwork.name}</IonChip>
            <IonButton
              fill="clear"
              onClick={() => refetch()}
              disabled={isFetching}
              className="toolbar-refresh"
            >
              <IonIcon icon={refresh} slot="icon-only" />
            </IonButton>
            <div className="wallet-kit-button">
              <WalletMultiButton />
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="launchpad-page">
          <section className="launchpad-hero launchpad-hero--simple">
            <div className="launchpad-hero__intro">
              <IonChip color="secondary">
                <IonIcon icon={sparkles} />
                Live feed
              </IonChip>
              <h1>Live health of launch.meme pools</h1>
              <p>
                Data comes straight from <code>https://launch.meme/api/tokens</code> using the
                provided Centrifuge token. Every metric reflects the current backend response —
                nothing is mocked.
              </p>
              <div className="hero-actions">
                <IonButton fill="outline" onClick={() => refetch()} disabled={isFetching}>
                  <IonIcon slot="start" icon={refresh} />
                  {isFetching ? 'Updating…' : 'Refresh data'}
                </IonButton>
                <span className="hero-updated">Last updated {lastUpdated ?? '—'}</span>
              </div>
            </div>

            <div className="launchpad-hero__stats launchpad-hero__stats--condensed">
              {metricCards.map((card) => (
                <div key={card.label} className="hero-stat hero-stat--wide">
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.sublabel}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="metrics-panel">
            <header className="metrics-panel__header">
              <div>
                <p>Leaders</p>
                <strong>Top pools by reported USD volume</strong>
              </div>
              <IonChip color="dark">
                {isBootstrapping ? 'Loading…' : `${leaders.length} highlighted`}
              </IonChip>
            </header>

            {isBootstrapping ? (
              <div className="leaders-skeleton">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`skeleton-${idx}`} className="leaders-skeleton__row">
                    <span className="skeleton-line" style={{ width: '40%' }} />
                    <span className="skeleton-line" style={{ width: '20%' }} />
                    <span className="skeleton-line" style={{ width: '20%' }} />
                    <span className="skeleton-line" style={{ width: '15%' }} />
                  </div>
                ))}
              </div>
            ) : leaders.length ? (
              <ul className="leaders-table">
                {leaders.map((token: LaunchToken) => (
                  <li key={token.id}>
                    <div className="leader-token">
                      <p>{token.name}</p>
                      <small>{token.symbol}</small>
                    </div>
                    <div className="leader-metric">
                      <span>${token.priceUsd.toFixed(6)}</span>
                      <small>Price</small>
                    </div>
                    <div className="leader-metric">
                      <span>
                        {token.change24h >= 0 ? '+' : ''}
                        {token.change24h.toFixed(2)}%
                      </span>
                      <small>24h</small>
                    </div>
                    <div className="leader-metric">
                      <span>
                        ${formatNumber(token.volume24h ?? 0, { maximumFractionDigits: 0 })}
                      </span>
                      <small>Volume</small>
                    </div>
                    <div className="leader-metric">
                      <span>{formatNumber(token.progress ?? 0, { maximumFractionDigits: 1 })}%</span>
                      <small>Progress</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                No spotlight tokens returned from the API. Verify the Centrifuge token or refresh the
                feed later.
              </div>
            )}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;

