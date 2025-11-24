import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonTitle,
    IonToolbar,
    IonSearchbar
} from '@ionic/react';
import { refresh, sparkles, trendingUp, trendingDown, search, filter } from 'ionicons/icons';
import { useSolana } from '../context/SolanaContext';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { useSpotlightTokens } from '../hooks/useSpotlightTokens';
import { LaunchToken } from '../services/launchMemeApi';
import { usePrivySolana } from '../hooks/usePrivySolana';
import { useMarketsStore } from '../store/marketsStore';
import './Tab1.css';
import {useLiveMetric} from "../hooks/useLiveMetrics";

const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...options }).format(value);

type SortOption = 'volume' | 'price' | 'progress' | 'holders' | 'name';
type SortDirection = 'asc' | 'desc';

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
    const pulse = useMarketsStore((state) => state.pulse);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('volume');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [visibleCount, setVisibleCount] = useState(20);
    const [showFilters, setShowFilters] = useState(false);

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

    const filteredAndSortedTokens = useMemo(() => {
        let filtered = pools;

        if (searchQuery) {
            filtered = filtered.filter(token =>
                token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const sorted = [...filtered].sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            switch (sortBy) {
                case 'volume':
                    aValue = a.volume24h ?? 0;
                    bValue = b.volume24h ?? 0;
                    break;
                case 'price':
                    aValue = a.priceUsd ?? 0;
                    bValue = b.priceUsd ?? 0;
                    break;
                case 'progress':
                    aValue = a.progress ?? 0;
                    bValue = b.progress ?? 0;
                    break;
                case 'holders':
                    aValue = a.holders ?? 0;
                    bValue = b.holders ?? 0;
                    break;
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortDirection === 'asc'
                ? (aValue as number) - (bValue as number)
                : (bValue as number) - (aValue as number);
        });

        return sorted;
    }, [pools, searchQuery, sortBy, sortDirection]);

    const leaders = useMemo(() => {
        return filteredAndSortedTokens.slice(0, visibleCount);
    }, [filteredAndSortedTokens, visibleCount]);

    const handleSortChange = (newSort: SortOption) => {
        if (newSort === sortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSort);
            setSortDirection('desc');
        }
        setShowFilters(false);
    };

    const getSortIcon = (column: SortOption) => {
        if (column !== sortBy) return null;
        return sortDirection === 'asc' ? trendingUp : trendingDown;
    };

    const getSortLabel = (column: SortOption) => {
        const labels = {
            volume: 'Volume',
            price: 'Price',
            progress: 'Progress',
            holders: 'Holders',
            name: 'Name'
        };
        return labels[column];
    };

    const liveActiveTokens = useLiveMetric(pulse?.activeTokens);
    const liveTvl = useLiveMetric(pulse?.tvl);
    const liveAvgPrice = useLiveMetric(pulse?.avgPrice);
    const liveParticipants = useLiveMetric(pulse?.participants);
    const liveTotalVolume = useLiveMetric(pulse?.totalVolume);

    const metricCards = [
        {
            label: 'Active tokens',
            value: liveActiveTokens.displayValue ? liveActiveTokens.displayValue.toLocaleString() : '—',
            isUpdating: liveActiveTokens.isUpdating,
            changeDirection: liveActiveTokens.changeDirection,
            sublabel: 'Trading tokens',
            live: true
        },
        {
            label: 'Total liquidity (◎)',
            value: liveTvl.displayValue ? formatNumber(liveTvl.displayValue, { maximumFractionDigits: 0 }) : '—',
            isUpdating: liveTvl.isUpdating,
            changeDirection: liveTvl.changeDirection,
            sublabel: 'Across all pools',
            live: true
        },
        {
            label: 'Avg. price (USD)',
            value: liveAvgPrice.displayValue ? `$${liveAvgPrice.displayValue.toFixed(6)}` : '$0.000000',
            isUpdating: liveAvgPrice.isUpdating,
            changeDirection: liveAvgPrice.changeDirection,
            sublabel: 'Average token price',
            live: true
        },
        {
            label: 'Total holders',
            value: liveParticipants.displayValue ? liveParticipants.displayValue.toLocaleString() : '—',
            isUpdating: liveParticipants.isUpdating,
            changeDirection: liveParticipants.changeDirection,
            sublabel: 'Unique wallets',
            live: true
        },
        {
            label: '24h volume (USD)',
            value: liveTotalVolume.displayValue ? `$${formatNumber(liveTotalVolume.displayValue, { maximumFractionDigits: 0 })}` : '—',
            isUpdating: liveTotalVolume.isUpdating,
            changeDirection: liveTotalVolume.changeDirection,
            sublabel: 'Total trading volume',
            live: true
        },
        {
            label: 'Hot Network',
            value: pulse?.hotNetwork || 'Solana',
            isUpdating: false,
            changeDirection: 'same' as const,
            sublabel: 'Most active chain',
            live: true
        }
    ];

    const lastUpdated = useMemo(() => {
        if (!pools.length) return null;
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [pools.length]);

    const currentNetwork = sdk.wallet.getCurrentNetwork();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Launch.Meme Telemetry</IonTitle>
                    <IonButtons slot="end" className="wallet-toolbar-actions">
                        <IonChip color="primary">{currentNetwork.name}</IonChip>
                        <WalletConnectButton />
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
                                <div key={card.label} className={`hero-stat hero-stat--wide ${card.live ? 'hero-stat--live' : ''}`}>
                                    <p>{card.label}</p>
                                    <strong
                                        className={`
                    ${card.isUpdating ? 'updating' : ''} 
                    ${card.changeDirection === 'up' ? 'direction-up' : ''}
                    ${card.changeDirection === 'down' ? 'direction-down' : ''}
                `}
                                    >
                                        {card.value}
                                    </strong>
                                    <span>{card.sublabel}</span>
                                    {card.live && <div className="live-indicator"></div>}
                                    {card.isUpdating && (
                                        <div className={`update-indicator ${card.changeDirection === 'up' ? 'direction-up' : card.changeDirection === 'down' ? 'direction-down' : ''}`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="metrics-panel">
                        <header className="metrics-panel__header">
                            <div className="metrics-panel__title">
                                <p>Token Explorer</p>
                                <strong>Search and filter all available tokens</strong>
                            </div>
                            <div className="search-filters-container">
                                <div className="search-box">
                                    <IonIcon icon={search} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search tokens by name or symbol..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                    {searchQuery && (
                                        <button
                                            className="clear-search"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                <div className="filters-section">
                                    <button
                                        className={`filter-toggle ${showFilters ? 'active' : ''}`}
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        <IonIcon icon={filter} />
                                        Sort by: {getSortLabel(sortBy)}
                                        <IonIcon icon={getSortIcon(sortBy) || trendingUp} />
                                    </button>

                                    {showFilters && (
                                        <div className="filter-dropdown">
                                            <div className="filter-options">
                                                {(['volume', 'price', 'progress', 'holders', 'name'] as SortOption[]).map(option => (
                                                    <button
                                                        key={option}
                                                        className={`filter-option ${sortBy === option ? 'active' : ''}`}
                                                        onClick={() => handleSortChange(option)}
                                                    >
                                                        <span>{getSortLabel(option)}</span>
                                                        {sortBy === option && (
                                                            <IonIcon icon={getSortIcon(option)!} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <IonChip color="dark" className="results-count">
                                    {pools.length} total, showing {leaders.length}
                                    {searchQuery && ` (${filteredAndSortedTokens.length} filtered)`}
                                </IonChip>
                            </div>
                        </header>

                        {leaders.length ? (
                            <>
                                <ul className="leaders-table">
                                    <li className="leaders-table-header">
                                        <div className="leader-token">
                                            <span>Token</span>
                                        </div>
                                        <div
                                            className="leader-metric sortable"
                                            onClick={() => handleSortChange('price')}
                                        >
                                            <span>
                                                Price USD
                                                {getSortIcon('price') && <IonIcon icon={getSortIcon('price')!} />}
                                            </span>
                                        </div>
                                        <div
                                            className="leader-metric sortable"
                                            onClick={() => handleSortChange('volume')}
                                        >
                                            <span>
                                                Volume
                                                {getSortIcon('volume') && <IonIcon icon={getSortIcon('volume')!} />}
                                            </span>
                                        </div>
                                        <div
                                            className="leader-metric sortable"
                                            onClick={() => handleSortChange('progress')}
                                        >
                                            <span>
                                                Progress
                                                {getSortIcon('progress') && <IonIcon icon={getSortIcon('progress')!} />}
                                            </span>
                                        </div>
                                        <div
                                            className="leader-metric sortable"
                                            onClick={() => handleSortChange('holders')}
                                        >
                                            <span>
                                                Holders
                                                {getSortIcon('holders') && <IonIcon icon={getSortIcon('holders')!} />}
                                            </span>
                                        </div>
                                    </li>
                                    {leaders.map((token: LaunchToken) => (
                                        <li key={token.id}>
                                            <div className="leader-token">
                                                <p>{token.name}</p>
                                                <small>{token.symbol}</small>
                                            </div>
                                            <div className="leader-metric">
                                                <span>${token.priceUsd.toFixed(6)}</span>
                                            </div>
                                            <div className="leader-metric">
                                                <span>${formatNumber(token.volume24h ?? 0, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="leader-metric">
                                                <span>
                                                    {token.progress !== undefined && token.progress !== null
                                                        ? formatNumber(token.progress, { maximumFractionDigits: 1 })
                                                        : '0.0'}%
                                                </span>
                                            </div>
                                            <div className="leader-metric">
                                                <span>{token.holders?.toLocaleString() || '0'}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {filteredAndSortedTokens.length > visibleCount && (
                                    <div className="load-more-container">
                                        <IonButton
                                            fill="outline"
                                            onClick={() => setVisibleCount(prev => Math.min(prev + 20, filteredAndSortedTokens.length))}
                                            className="load-more-button"
                                        >
        <span className="button-text-desktop">
            Load more ({filteredAndSortedTokens.length - visibleCount} remaining)
        </span>
                                            <span className="button-text-mobile">
            Load more ({filteredAndSortedTokens.length - visibleCount})
        </span>
                                        </IonButton>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="empty-state">
                                {searchQuery ? 'No tokens found matching your search.' : 'No tokens available.'}
                            </div>
                        )}
                    </section>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Tab1;