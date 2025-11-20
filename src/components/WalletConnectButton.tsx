import React, { useState, useEffect, useRef } from 'react';
import { IonButton, IonIcon, IonSpinner, IonPopover, IonList, IonItem, IonLabel, IonToast } from '@ionic/react';
import { wallet, logOut, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSolana } from '../context/SolanaContext';
import './WalletConnectButton.css';

export const WalletConnectButton: React.FC = () => {
  const { walletState, isLoading, error, connectWallet, disconnectWallet } = useSolana();
  const walletAdapter = useWallet();
  const { setVisible } = useWalletModal();
  const [showPopover, setShowPopover] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');
  const connectingRef = useRef(false);

  useEffect(() => {
    if (error) {
      setToastMessage(error);
      setToastColor('danger');
      setShowToast(true);
    }
  }, [error]);

  const isConnecting = isLoading || walletAdapter.connecting;

  const handleConnect = async () => {
    try {
      if (walletAdapter.connected) {
        setShowPopover(true);
        return;
      }

      // If wallet is already selected, try multiple connection methods
      if (walletAdapter.wallet) {
        // Method 1: Try direct wallet adapter connection (simplest)
        try {
          console.log('Attempting direct wallet adapter connection...');
          await walletAdapter.connect();

          // Wait for state to update
          let attempts = 0;
          while (attempts < 15 && !walletAdapter.connected) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
          }

          if (walletAdapter.connected) {
            console.log('Direct connection successful');
            return;
          }
        } catch (directErr: any) {
          console.log('Direct connection failed, trying wrapped connection...', directErr);

          // Method 2: Try our wrapped connectWallet
          try {
            await connectWallet();
          } catch (wrappedErr: any) {
            // If both fail, show the most relevant error
            const finalErr = directErr?.name === 'WalletAccountError' ? directErr : wrappedErr;
            throw finalErr;
          }
        }
      } else {
        // Show modal to select wallet
        setVisible(true);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to connect wallet';

      // Handle specific wallet adapter errors
      if (err?.name === 'WalletAccountError') {
        errorMessage = 'Connection was rejected. Please approve the request in your wallet.';
      } else if (err?.name === 'WalletConnectionError') {
        errorMessage = 'Unable to connect to wallet. Please try again.';
      } else if (err?.name === 'WalletNotInstalledError') {
        errorMessage = 'Wallet extension not found. Please install it first.';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setToastMessage(errorMessage);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  // Auto-connect when wallet is selected from modal
  useEffect(() => {
    const walletName = walletAdapter.wallet?.adapter.name;
    if (walletName && !walletAdapter.connected && !isConnecting && !error && !connectingRef.current) {
      connectingRef.current = true;
      const timer = setTimeout(async () => {
        try {
          // Try our connectWallet first
          await connectWallet();
        } catch (err: any) {
          // Fallback: try direct connection
          if (!walletAdapter.connected) {
            try {
              console.log('Auto-connect: trying direct wallet adapter connection...');
              await walletAdapter.connect();
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (adapterErr: any) {
              let errorMessage = 'Failed to connect wallet';

              if (err?.name === 'WalletAccountError' || adapterErr?.name === 'WalletAccountError') {
                errorMessage = 'Connection was rejected. Please approve the request in your wallet.';
              } else if (err?.name === 'WalletConnectionError' || adapterErr?.name === 'WalletConnectionError') {
                errorMessage = 'Unable to connect to wallet. Please try again.';
              } else if (err?.name === 'WalletNotInstalledError' || adapterErr?.name === 'WalletNotInstalledError') {
                errorMessage = 'Wallet extension not found. Please install it first.';
              } else if (err?.message || adapterErr?.message) {
                errorMessage = err?.message || adapterErr?.message;
              }

              setToastMessage(errorMessage);
              setToastColor('danger');
              setShowToast(true);
            }
          }
        } finally {
          connectingRef.current = false;
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        connectingRef.current = false;
      };
    }
  }, [walletAdapter.wallet?.adapter.name, walletAdapter.connected, isConnecting, error, connectWallet, walletAdapter]);

  // More lenient connection check - if wallet adapter says connected, show as connected
  const isConnected = walletAdapter.connected && walletAdapter.publicKey;

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setShowPopover(false);
      setToastMessage('Wallet disconnected');
      setToastColor('success');
      setShowToast(true);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to disconnect wallet');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getWalletName = () => {
    if (walletAdapter.wallet?.adapter.name) {
      return walletAdapter.wallet.adapter.name;
    }
    if (walletState.wallet?.type === 'phantom') return 'Phantom';
    if (walletState.wallet?.type === 'solflare') return 'Solflare';
    return 'Wallet';
  };

  return (
    <>
      <div className="wallet-connect-wrapper">
        {isConnected ? (
          <IonButton
            id="wallet-connect-popover-trigger"
            fill="solid"
            color="success"
            onClick={() => setShowPopover(true)}
            className="wallet-connect-button wallet-connect-button--connected"
          >
            <IonIcon icon={checkmarkCircle} slot="start" />
            <span className="wallet-connect-button__text">
              <span className="wallet-connect-button__name">{getWalletName()}</span>
              <span className="wallet-connect-button__address">
                {walletAdapter.publicKey ? formatAddress(walletAdapter.publicKey.toBase58()) : ''}
              </span>
            </span>
          </IonButton>
        ) : isConnecting ? (
          <IonButton
            fill="solid"
            color="medium"
            disabled
            className="wallet-connect-button wallet-connect-button--connecting"
          >
            <IonSpinner name="crescent" slot="start" />
            <span>Connecting...</span>
          </IonButton>
        ) : (
          <IonButton
            fill="solid"
            color="primary"
            onClick={handleConnect}
            className="wallet-connect-button wallet-connect-button--disconnected"
          >
            <IonIcon icon={wallet} slot="start" />
            <span>Connect Wallet</span>
          </IonButton>
        )}

        {error && !isConnecting && (
          <IonButton
            fill="clear"
            color="danger"
            size="small"
            onClick={() => {
              setToastMessage(error);
              setToastColor('danger');
              setShowToast(true);
            }}
            className="wallet-connect-error"
          >
            <IonIcon icon={alertCircle} />
          </IonButton>
        )}
      </div>

      <IonPopover
        isOpen={showPopover}
        onDidDismiss={() => setShowPopover(false)}
        trigger="wallet-connect-popover-trigger"
        side="bottom"
        alignment="end"
      >
        <IonList>
          <IonItem>
            <IonLabel>
              <h3>{getWalletName()}</h3>
              <p>{walletAdapter.publicKey ? formatAddress(walletAdapter.publicKey.toBase58()) : 'Not connected'}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={handleDisconnect} detail={false}>
            <IonIcon icon={logOut} slot="start" />
            <IonLabel>Disconnect</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        color={toastColor}
        position="top"
      />
    </>
  );
};

