import { Connection, PublicKey, clusterApiUrl, Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletState, SolanaSDKConfig } from './types';
import { NETWORKS } from './utils';

interface CustomWalletAdapter {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
}

export class SolanaWalletManager {
  private connection: Connection;
  private config: SolanaSDKConfig;
  private walletState: WalletState;
  private listeners: ((state: WalletState) => void)[] = [];
  private customAdapter: CustomWalletAdapter | null = null;

  constructor(config: SolanaSDKConfig) {
    this.config = config;
    this.connection = new Connection(
      config.rpcEndpoint || NETWORKS[config.network].rpcUrl,
      config.commitment || 'confirmed'
    );
    
    this.walletState = {
      connected: false,
      connecting: false,
      publicKey: null,
      wallet: null
    };
  }

  /**
   * Subscribe to wallet state changes
   */
  onStateChange(callback: (state: WalletState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => listener({ ...this.walletState }));
  }

  /**
   * Connect a custom wallet adapter (e.g., from Privy)
   */
  async connectCustomWallet(walletName: string, adapter: CustomWalletAdapter): Promise<void> {
    this.walletState.connecting = true;
    this.notifyStateChange();

    try {
      this.customAdapter = adapter;
      
      this.walletState = {
        connected: true,
        connecting: false,
        publicKey: adapter.publicKey,
        wallet: {
          name: walletName,
          type: 'custom'
        }
      };

      this.notifyStateChange();
    } catch (error) {
      this.walletState.connecting = false;
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Simulate wallet connection (for demo purposes)
   * In a real implementation, this would integrate with actual wallet adapters
   */
  async connectWallet(walletType: 'phantom' | 'solflare' | 'demo' = 'demo'): Promise<void> {
    this.walletState.connecting = true;
    this.notifyStateChange();

    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (walletType === 'demo') {
        // Generate a demo public key for testing
        const demoPublicKey = new PublicKey('11111111111111111111111111111112');
        
        this.walletState = {
          connected: true,
          connecting: false,
          publicKey: demoPublicKey,
          wallet: {
            name: 'Demo Wallet',
            type: walletType
          }
        };
      } else {
        // In a real implementation, you would use the wallet adapter here
        throw new Error(`${walletType} wallet connection not implemented yet`);
      }

      this.notifyStateChange();
    } catch (error) {
      this.walletState.connecting = false;
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.customAdapter = null;
    this.walletState = {
      connected: false,
      connecting: false,
      publicKey: null,
      wallet: null
    };
    this.notifyStateChange();
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.walletState };
  }

  /**
   * Get wallet balance in lamports
   */
  async getBalance(): Promise<number> {
    if (!this.walletState.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.connection.getBalance(this.walletState.publicKey);
      return balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Change network
   */
  switchNetwork(network: 'mainnet-beta' | 'testnet' | 'devnet'): void {
    this.config.network = network;
    this.connection = new Connection(
      this.config.rpcEndpoint || NETWORKS[network].rpcUrl,
      this.config.commitment || 'confirmed'
    );
  }

  /**
   * Get current network info
   */
  getCurrentNetwork() {
    return NETWORKS[this.config.network];
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.walletState.connected;
  }

  /**
   * Get public key as string
   */
  getPublicKeyString(): string | null {
    return this.walletState.publicKey?.toBase58() || null;
  }

  /**
   * Sign a transaction using the connected wallet
   */
  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    if (!this.walletState.connected) {
      throw new Error('Wallet not connected');
    }

    if (this.customAdapter) {
      return this.customAdapter.signTransaction(transaction);
    }

    // For demo wallet, we can't actually sign
    if (this.walletState.wallet?.type === 'demo') {
      throw new Error('Demo wallet cannot sign transactions');
    }

    throw new Error('No wallet adapter available');
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.walletState.connected) {
      throw new Error('Wallet not connected');
    }

    if (this.customAdapter) {
      return this.customAdapter.signAllTransactions(transactions);
    }

    // For demo wallet, we can't actually sign
    if (this.walletState.wallet?.type === 'demo') {
      throw new Error('Demo wallet cannot sign transactions');
    }

    throw new Error('No wallet adapter available');
  }
} 