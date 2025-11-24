import { LaunchToken, RawLaunchToken } from './launchMemeApi';

type StreamTokenPayload = Record<string, unknown> & {
  token?: string;
  name?: string;
  symbol?: string;
  priceUsd?: number;
  priceSol?: number;
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

  const parseNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  return {
    id: payload.token,
    name: payload.name,
    symbol: String(payload.symbol),
    priceUsd: parseNumber(payload.priceUsd ?? payload.price, 0),
    priceSol: parseNumber(payload.priceSol, 0),
    price: parseNumber(payload.priceUsd ?? payload.price, 0),
    liquidity: parseNumber(payload._balanceSol ?? payload.liquidity, 0),
    fdv: parseNumber(payload.marketCapUsd ?? payload.fdv, 0),
    volume24h: parseNumber(payload.volumeUsd ?? payload.volume24h, 0),
    progress: parseNumber(payload.progress, 0),
    network: 'Solana',
      holders: parseNumber(payload.holders ?? payload.holder, 0),
    iconUrl: (payload.photo as string) || undefined,
    bannerUrl: (payload.metadataUri as string) || undefined,
    createdAt: payload.mint_time
      ? new Date(Number(payload.mint_time) * 1000).toISOString()
      : new Date().toISOString(),
    raw: {
      ...payload,
      token: payload.token,
      name: payload.name,
      symbol: payload.symbol,
      priceUsd: parseNumber(payload.priceUsd ?? payload.price, 0),
      priceSol: parseNumber(payload.priceSol, 0),
      volumeUsd: parseNumber(payload.volumeUsd ?? payload.volume24h, 0),
      _balanceSol: parseNumber(payload._balanceSol ?? payload.liquidity, 0),
      marketCapUsd: parseNumber(payload.marketCapUsd ?? payload.fdv, 0),
      holders: parseNumber(payload.holders ?? payload.holder, 0),
      progress: parseNumber(payload.progress, 0)
    } as RawLaunchToken
  };
};

