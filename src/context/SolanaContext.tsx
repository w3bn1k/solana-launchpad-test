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

      const adapter = {
        publicKey: wallet.publicKey,
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

      sdk.wallet
        .connectCustomWallet(wallet.wallet?.adapter.name || 'Solana Wallet', adapter)
        .catch((err) => setError(err instanceof Error ? err.message : 'Wallet sync failed'));
    } else {
      lastConnectedKeyRef.current = null;
      if (walletState.wallet?.type === 'custom') {
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

  const connectWallet = async () => {
    try {
      setError(null);
      setIsLoading(true);
      if (wallet.connected) {
        return;
      }
      if (!wallet.wallet) {
        setVisible(true);
        return;
      }
      await wallet.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
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