import React from 'react';
import { LaunchToken } from '../../services/launchMemeApi';
import './SpotlightCard.css';

type SpotlightCardProps = {
  token?: LaunchToken;
  active?: boolean;
  onSelect?: (id: string) => void;
  isLoading?: boolean;
};

const SkeletonCard = () => (
  <div className="spotlight-card spotlight-card--skeleton" aria-hidden="true">
    <div className="skeleton-tag" />
    <div className="skeleton-line" style={{ width: '70%' }} />
    <div className="skeleton-line" style={{ width: '50%' }} />
    <div className="skeleton-line" style={{ width: '40%' }} />
    <div className="skeleton-footer">
      <span className="skeleton-line" style={{ width: '30%' }} />
      <span className="skeleton-line" style={{ width: '45%' }} />
      <span className="skeleton-line" style={{ width: '35%' }} />
    </div>
  </div>
);

export const SpotlightCard: React.FC<SpotlightCardProps> = ({ token, active, onSelect, isLoading }) => {
  if (isLoading || !token) {
    return <SkeletonCard />;
  }

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

