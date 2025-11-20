import { useEffect } from 'react';
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { usePrivyAuth } from '../context/PrivyContext';
import { useSolana } from '../context/SolanaContext';

export const usePrivySolana = () => {
  const { authenticated, user } = usePrivyAuth();
  const { sdk } = useSolana();

  useEffect(() => {
    const handlePrivyAuth = async () => {
      if (authenticated && user?.email?.address) {
        try {
          // Создаем детерминированный кошелек на основе email пользователя
          // В реальном приложении нужно использовать более безопасный метод
          // Например, использовать embedded wallets от Privy
          const seed = new TextEncoder().encode(user.email.address);
          const seedArray = new Uint8Array(32);
          for (let i = 0; i < seed.length && i < 32; i++) {
            seedArray[i] = seed[i];
          }
          
          const keypair = Keypair.fromSeed(seedArray);
          
          // Подключаем кошелек к SDK
          await sdk.wallet.connectCustomWallet('Privy Email Wallet', {
            publicKey: keypair.publicKey,
            signTransaction: async (tx: Transaction | VersionedTransaction) => {
              if (tx instanceof Transaction) {
                tx.sign(keypair);
              }
              return tx;
            },
            signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
              txs.forEach((tx) => {
                if (tx instanceof Transaction) {
                  tx.sign(keypair);
                }
              });
              return txs;
            }
          });
        } catch (error) {
          console.error('Failed to connect wallet via Privy:', error);
        }
      } else if (!authenticated) {
        // Отключаем кошелек при выходе
        try {
          await sdk.wallet.disconnectWallet();
        } catch (error) {
          console.error('Failed to disconnect wallet:', error);
        }
      }
    };

    handlePrivyAuth();
  }, [authenticated, user, sdk]);

  return { authenticated, user };
}; 