import React from 'react';
import './StarRating.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const Star = ({ fillPercent = 0, size = 16 }) => (
  <span className="star-rating-star" style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size} height={size} className="star-rating-star-base">
      <path d="M12 2.5l2.95 5.98 6.6.96-4.77 4.64 1.13 6.58L12 17.56 6.09 20.66l1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
    </svg>
    <span className="star-rating-fill" style={{ width: `${fillPercent}%` }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="star-rating-star-fill">
        <path d="M12 2.5l2.95 5.98 6.6.96-4.77 4.64 1.13 6.58L12 17.56 6.09 20.66l1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
      </svg>
    </span>
  </span>
);

const StarRating = ({ value = 0, size = 16, showValue = false, className = '' }) => {
  const normalizedValue = clamp(Number(value) || 0, 0, 5);

  return (
    <div className={`star-rating ${className}`.trim()} aria-label={`Valoracion ${normalizedValue} de 5`}>
      <div className="star-rating-stars">
        {[0, 1, 2, 3, 4].map((index) => {
          const fillPercent = clamp((normalizedValue - index) * 100, 0, 100);
          return <Star key={index} fillPercent={fillPercent} size={size} />;
        })}
      </div>
      {showValue && <span className="star-rating-value">{normalizedValue.toFixed(1)}</span>}
    </div>
  );
};

export default StarRating;
