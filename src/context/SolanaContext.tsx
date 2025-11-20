import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SolanaSDK, createSolanaSDK, defaultConfig } from '../sdk';
import { WalletState } from '../sdk/types';

interface SolanaContextType {
  sdk: SolanaSDK;
  walletState: WalletState;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (network: 'mainnet-beta' | 'testnet') => void;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: React.FC<SolanaProviderProps> = ({ children }) => {
  const [sdk] = useState(() => createSolanaSDK(defaultConfig));
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    connecting: false,
    publicKey: null,
    wallet: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const lastConnectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to wallet state changes
    const unsubscribe = sdk.wallet.onStateChange((newState) => {
      setWalletState(newState);
      setIsLoading(newState.connecting);
    });

    return unsubscribe;
  }, [sdk]);


  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const currentKey = wallet.publicKey.toBase58();
      if (currentKey === lastConnectedKeyRef.current) return;
      lastConnectedKeyRef.current = currentKey;

      // Sync with SDK wallet manager
      const syncWithSDK = async () => {
        try {
          const adapter = {
            publicKey: wallet.publicKey!,
            signTransaction: async (tx: Parameters<NonNullable<typeof wallet.signTransaction>>[0]) => {
              if (!wallet.signTransaction) {
                throw new Error('Wallet does not support transaction signing');
              }
              return wallet.signTransaction(tx);
            },
            signAllTransactions: async (txs: Parameters<NonNullable<typeof wallet.signAllTransactions>>[0]) => {
              if (!wallet.signAllTransactions) {
                throw new Error('Wallet does not support batch signing');
              }
              return wallet.signAllTransactions(txs);
            }
          };

          await sdk.wallet.connectCustomWallet(
            wallet.wallet?.adapter.name || 'Solana Wallet',
            adapter
          );
          setError(null);
        } catch (err) {
          // Don't set error for sync failures - wallet is still connected via adapter
          console.warn('Wallet SDK sync error (non-critical):', err);
        }
      };

      syncWithSDK();
    } else {
      lastConnectedKeyRef.current = null;
      if (walletState.wallet?.type === 'custom' && !wallet.connected) {
        sdk.wallet.disconnectWallet().catch((err) => {
          console.error('Failed to disconnect custom wallet', err);
        });
      }
    }
  }, [
    sdk.wallet,
    wallet.connected,
    wallet.publicKey,
    wallet.signAllTransactions,
    wallet.signTransaction,
    wallet.wallet,
    walletState.wallet
  ]);

  const connectWallet = async (retryCount = 0): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      
      // If already connected, just sync state
      if (wallet.connected && wallet.publicKey) {
        setIsLoading(false);
        return;
      }
      
      // If no wallet selected, show modal
      if (!wallet.wallet) {
        setVisible(true);
        setIsLoading(false);
        return;
      }
      
      // Try to connect with timeout
      const connectPromise = wallet.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Wait for state to sync
      let attempts = 0;
      while (attempts < 10 && (!wallet.connected || !wallet.publicKey)) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Connection state not updated');
      }
      
    } catch (err: any) {
      // Handle specific wallet adapter errors
      let errorMessage = 'Failed to connect wallet';
      let shouldRetry = false;
      
      if (err?.name === 'WalletAccountError') {
        errorMessage = 'Connection was rejected. Please approve the request in your wallet.';
      } else if (err?.name === 'WalletConnectionError') {
        errorMessage = 'Unable to connect to wallet. Please try again.';
        shouldRetry = retryCount < 2;
      } else if (err?.name === 'WalletNotInstalledError') {
        errorMessage = 'Wallet extension not found. Please install it first.';
      } else if (err?.name === 'WalletNotReadyError') {
        errorMessage = 'Wallet is not ready. Please refresh the page.';
        shouldRetry = retryCount < 1;
      } else if (err?.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
        shouldRetry = retryCount < 2;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Retry logic
      if (shouldRetry && retryCount < 2) {
        console.log(`Retrying wallet connection (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return connectWallet(retryCount + 1);
      }
      
      setError(errorMessage);
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setError(null);
      await wallet.disconnect();
      await sdk.wallet.disconnectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  const switchNetwork = (network: 'mainnet-beta' | 'testnet') => {
    try {
      setError(null);
      sdk.wallet.switchNetwork(network);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch network');
    }
  };

  const value: SolanaContextType = {
    sdk,
    walletState,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork
  };

  return (
    <SolanaContext.Provider value={value}>
      {children}
    </SolanaContext.Provider>
  );
};

export const useSolana = (): SolanaContextType => {
  const context = useContext(SolanaContext);
  if (context === undefined) {
    throw new Error('useSolana must be used within a SolanaProvider');
  }
  return context;
}; 