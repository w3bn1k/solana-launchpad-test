import React from 'react';
import { LaunchToken } from '../../services/launchMemeApi';
import './SpotlightCard.css';

type SpotlightCardProps = {
  token: LaunchToken;
  active?: boolean;
  onSelect?: (id: string) => void;
};

export const SpotlightCard: React.FC<SpotlightCardProps> = ({ token, active, onSelect }) => {
  return (
    <button
      className={`spotlight-card ${active ? 'spotlight-card--active' : ''}`}
      style={{
        backgroundImage: token.bannerUrl ? `linear-gradient(120deg, rgba(8,12,24,0.9), rgba(8,12,24,0.6)), url(${token.bannerUrl})` : undefined
      }}
      onClick={() => onSelect?.(token.id)}
    >
      <div className="spotlight-card__body">
        <div className="spotlight-card__tag">{token.network}</div>
        <div className="spotlight-card__title">
          {token.name}{' '}
          <span className="spotlight-card__symbol">{token.symbol}</span>
        </div>
        <div className="spotlight-card__price">${token.price.toFixed(4)}</div>
        <div className={`spotlight-card__change ${token.change24h >= 0 ? 'up' : 'down'}`}>
          {token.change24h >= 0 ? '+' : ''}
          {token.change24h.toFixed(2)}%
        </div>
      </div>
      <div className="spotlight-card__footer">
        <div>
          <p>Liquidity</p>
          <strong>${token.liquidity.toLocaleString()}</strong>
        </div>
        <div>
          <p>FDV</p>
          <strong>${token.fdv.toLocaleString()}</strong>
        </div>
        <div>
          <p>Progress</p>
          <div className="spotlight-card__progress">
            <span style={{ width: `${token.progress}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
};

