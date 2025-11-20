import React, { useEffect, useMemo, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/react';
import { flash, sparkles, wifi, wallet, logOut, key, refresh } from 'ionicons/icons';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolana } from '../context/SolanaContext';
import { usePrivyAuth } from '../context/PrivyContext';
import { usePrivySolana } from '../hooks/usePrivySolana';
import { useSpotlightTokens } from '../hooks/useSpotlightTokens';
import { SpotlightCard } from '../components/terminal/SpotlightCard';
import { MarketTerminal } from '../components/terminal/MarketTerminal';
import { useMarketsStore } from '../store/marketsStore';
import { submitLaunchOrder } from '../services/launchMemeApi';
import './Tab1.css';

const Tab1: React.FC = () => {
  const { sdk, walletState, switchNetwork } = useSolana();
  const { login, logout, authenticated, user, ready } = usePrivyAuth();
  usePrivySolana();

  const spotlight = useMarketsStore((state) => state.spotlight);
  const selectedToken = useMarketsStore((state) => state.selectedToken);
  const pulse = useMarketsStore((state) => state.pulse);
  const orderbook = useMarketsStore((state) => state.orderbook);
  const trades = useMarketsStore((state) => state.trades);
  const streamStatus = useMarketsStore((state) => state.streamStatus);
  const pulseFeed = useMarketsStore((state) => state.pulseFeed);
  const setSpotlight = useMarketsStore((state) => state.setSpotlight);
  const selectToken = useMarketsStore((state) => state.selectToken);
  const connectStreams = useMarketsStore((state) => state.connectStreams);
  const disconnectStreams = useMarketsStore((state) => state.disconnectStreams);
  const refreshSelected = useMarketsStore((state) => state.refreshSelected);
  const isLoadingSnapshot = useMarketsStore((state) => state.isLoadingSnapshot);
  const { data: spotlightTokens = [] } = useSpotlightTokens();

  const [orderIntent, setOrderIntent] = useState<'market' | 'limit'>('market');
  const [orderCurrency, setOrderCurrency] = useState<'SOL' | 'USDC'>('SOL');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderToast, setOrderToast] = useState<{ open: boolean; message: string; color?: string }>({
    open: false,
    message: ''
  });
  const [showNetworkAlert, setShowNetworkAlert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    connectStreams();
    return () => {
      disconnectStreams();
    };
  }, [connectStreams, disconnectStreams]);

  useEffect(() => {
    if (!spotlightTokens.length) {
      return;
    }
    setSpotlight(spotlightTokens);
    const { selectedToken: currentSelected } = useMarketsStore.getState();
    if (!currentSelected && spotlightTokens[0]) {
      useMarketsStore.getState().selectToken(spotlightTokens[0].id);
    }
  }, [spotlightTokens, setSpotlight]);

  const handleOrderSubmit = async () => {
    if (!selectedToken) {
      setOrderToast({ open: true, message: 'Select a token first', color: 'warning' });
      return;
    }

    if (!walletState.connected || !walletState.publicKey) {
      setOrderToast({ open: true, message: 'Connect your wallet', color: 'warning' });
      return;
    }

    const payload = {
      tokenId: selectedToken.id,
      amount: Number(orderAmount),
      currency: orderCurrency,
      intent: orderIntent,
      walletAddress: walletState.publicKey.toString(),
      slippageBps: 50
    };

    const result = await submitLaunchOrder(payload);
    if (result.success) {
      setOrderToast({ open: true, message: 'Participation queued ✅', color: 'success' });
      setOrderAmount('');
      refreshSelected();
    } else {
      setOrderToast({ open: true, message: 'Order failed. Check logs', color: 'danger' });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSelected();
    setRefreshing(false);
  };

  const heroStats = useMemo(
    () => [
      { label: 'Total TVL', value: pulse ? `$${pulse.tvl.toLocaleString()}` : '—' },
      { label: 'Participants', value: pulse ? pulse.participants.toLocaleString() : '—' },
      { label: 'Avg. APR', value: pulse ? `${pulse.avgApr.toFixed(1)}%` : '—' },
      { label: 'Hot Network', value: pulse?.hotNetwork ?? 'Solana' }
    ],
    [pulse]
  );

  const currentNetwork = sdk.wallet.getCurrentNetwork();

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar color="transparent">
          <IonTitle>Launch.Meme Terminal</IonTitle>
          <IonButtons slot="end" className="wallet-toolbar-actions">
            {walletState.connected && (
              <IonButton fill="clear" onClick={handleRefresh} disabled={refreshing}>
                <IonIcon icon={refresh} />
              </IonButton>
            )}
            <IonButton fill="clear" onClick={() => setShowNetworkAlert(true)}>
              <IonChip color="primary">{currentNetwork.name}</IonChip>
            </IonButton>
            <div className="wallet-kit-button">
              <WalletMultiButton />
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="launchpad-page">
          <section className="launchpad-hero">
            <div className="launchpad-hero__intro">
              <IonChip color="secondary">
                <IonIcon icon={sparkles} />
                Live launchpad
              </IonChip>
              <h1>Trade the vibe-first meme launches</h1>
              <p>
                Curated Solana memecoins, realtime orderflow, and guided participation flows for both keyboard warriors and mobile-first creators.
              </p>
            </div>

            <div className="launchpad-hero__stats">
              {heroStats.map((stat) => (
                <div key={stat.label} className="hero-stat">
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="spotlight-grid">
            {spotlight.map((token) => (
              <SpotlightCard
                key={token.id}
                token={token}
                active={token.id === selectedToken?.id}
                onSelect={(id) => selectToken(id)}
              />
            ))}
          </section>

          <section className="terminal-wrapper">
            <MarketTerminal
              token={selectedToken}
              orderbook={orderbook}
              trades={trades}
              pulseFeed={pulseFeed}
              streamStatus={streamStatus}
              onRefreshSnapshot={() => refreshSelected()}
            />

            <div className="terminal-right">
              <div className="order-form">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Join {selectedToken?.symbol ?? 'Pool'}</h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    <IonIcon icon={wifi} /> Stream {streamStatus}
                  </span>
                </header>

                {!authenticated && (
                  <IonButton fill="outline" onClick={login} disabled={!ready}>
                    <IonIcon slot="start" icon={key} />
                    Login with Privy
                  </IonButton>
                )}

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleOrderSubmit();
                  }}
                >
                  <label>
                    Intent
                    <select value={orderIntent} onChange={(e) => setOrderIntent(e.target.value as 'market' | 'limit')}>
                      <option value="market">Instant (market)</option>
                      <option value="limit">Set target (limit)</option>
                    </select>
                  </label>

                  <label>
                    Currency
                    <select value={orderCurrency} onChange={(e) => setOrderCurrency(e.target.value as 'SOL' | 'USDC')}>
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </label>

                  <label>
                    Amount
                    <input
                      type="number"
                      min="0"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </label>

                  <button type="submit" disabled={isLoadingSnapshot}>
                    <IonIcon icon={flash} />
                    &nbsp; Commit Liquidity
                  </button>
                </form>
              </div>

              <div className="portfolio-card">
                <h3>Wallet cockpit</h3>
                {walletState.connected && walletState.publicKey ? (
                  <ul>
                    <li>
                      <span>Address</span>
                      <span>{walletState.publicKey.toBase58().slice(0, 4)}...{walletState.publicKey.toBase58().slice(-4)}</span>
                    </li>
                    <li>
                      <span>Network</span>
                      <span>{currentNetwork.name}</span>
                    </li>
                    <li>
                      <span>Mode</span>
                      <span>{orderIntent.toUpperCase()}</span>
                    </li>
                  </ul>
                ) : (
                  <p>Connect your Solana wallet or use demo mode to mirror flows.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <IonAlert
          isOpen={showNetworkAlert}
          onDidDismiss={() => setShowNetworkAlert(false)}
          header="Select Network"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Mainnet', handler: () => switchNetwork('mainnet-beta') },
            { text: 'Testnet', handler: () => switchNetwork('testnet') }
          ]}
        />

        <IonToast
          isOpen={orderToast.open}
          message={orderToast.message}
          color={orderToast.color}
          duration={2000}
          onDidDismiss={() => setOrderToast((prev) => ({ ...prev, open: false }))}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
