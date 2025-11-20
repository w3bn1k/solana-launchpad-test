import { LaunchToken, RawLaunchToken } from './launchMemeApi';

type StreamTokenPayload = Record<string, unknown> & {
  token?: string;
  name?: string;
  symbol?: string;
  priceUsd?: number;
  priceSol?: number;
  change24h?: number;
  volumeUsd?: number;
  _balanceSol?: number;
  marketCapUsd?: number;
  holders?: number;
  progress?: number;
  photo?: string;
  metadataUri?: string;
  mint_time?: number;
};

export const mapTokenFromStream = (payload: StreamTokenPayload): LaunchToken | undefined => {
  if (!payload?.token || !payload.name || !payload.symbol) {
    return undefined;
  }

  return {
    id: payload.token,
    name: payload.name,
    symbol: String(payload.symbol),
    priceUsd: Number(payload.priceUsd ?? payload.price ?? 0),
    priceSol: Number(payload.priceSol ?? 0),
    price: Number(payload.priceUsd ?? payload.price ?? 0),
    change24h: Number(payload.change24h ?? 0),
    liquidity: Number(payload._balanceSol ?? 0),
    fdv: Number(payload.marketCapUsd ?? 0),
    volume24h: Number(payload.volumeUsd ?? 0),
    progress: Number(payload.progress ?? 0),
    network: 'Solana',
    score: Number(payload.holders ?? 0),
    iconUrl: (payload.photo as string) || undefined,
    bannerUrl: (payload.metadataUri as string) || undefined,
    createdAt: payload.mint_time ? new Date(Number(payload.mint_time)).toISOString() : new Date().toISOString(),
    raw: payload as RawLaunchToken
  };
};

