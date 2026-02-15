import React from 'react';
import { Link } from 'react-router-dom';
import { FaComment, FaEye } from 'react-icons/fa';
import StarRating from '../ui/StarRating';
import './PostCard.css';

const StatThumbIcon = ({ direction = 'up' }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="stat-thumb-icon">
    {direction === 'up' ? (
      <path
        d="M13 3l-1 5H8a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7l4-8a2 2 0 0 0-2-3h-3l1-5h-2zM4 10h2v9H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M11 21l1-5h4a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9L5 13a2 2 0 0 0 2 3h3l-1 5h2zM20 14h-2V5h2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const PostCard = ({ post }) => {
  const categoryLabels = {
    piso: 'Piso',
    plaza: 'Plaza',
    club: 'Club/Local'
  };

  const areaLabel = post.location?.geo?.label;
  const ratings = post.ratings || {};
  const hasRatings = (ratings.count || 0) > 0;

  return (
    <div className={`post-card ${post.isPinned ? 'pinned' : ''}`}>
      {post.isPinned && <span className="pin-badge">📌 Fijado</span>}
      
      <div className="post-header">
        <div className="post-meta">
          <Link to={`/profile/${post.author?._id || post.author}`} className="post-author">
            {post.author?.username || 'Usuario'}
          </Link>
          <span className="post-date">
            {new Date(post.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="post-badges">
          <span className="badge badge-primary">{categoryLabels[post.category]}</span>
          {post.flags?.hasOpenReports && (
            <span className="badge badge-warning">En revisión</span>
          )}
          {post.flags?.hasApprovedReports && (
            <span className="badge badge-danger">Reportado (confirmado)</span>
          )}
        </div>
      </div>

      <Link to={`/post/${post._id}`} className="post-title-link">
        <h2 className="post-title">{post.title}</h2>
      </Link>
      {areaLabel && <p className="post-area-label">Zona: {areaLabel}</p>}

      <p className="post-excerpt">
        {(post.content || '').substring(0, 200)}
        {(post.content || '').length > 200 && '...'}
      </p>

      <div className="post-ratings">
        {hasRatings ? (
          <>
            <div className="post-rating-row">
              <span className="post-rating-label">Confort</span>
              <StarRating value={ratings.avgConfort} showValue />
            </div>
            <div className="post-rating-row">
              <span className="post-rating-label">Seguridad</span>
              <StarRating value={ratings.avgSeguridad} showValue />
            </div>
            <div className="post-rating-count">Basada en {ratings.count} valoraciones</div>
          </>
        ) : (
          <div className="post-rating-empty">Sin valoraciones todavía</div>
        )}
      </div>

      {post.street && (
        <p className="post-location">
          📍 {post.street}, {post.city}
        </p>
      )}

      <div className="post-footer">
        <div className="post-stats">
          <span className="stat-item">
            <StatThumbIcon direction="up" /> {post.votes?.upvotes?.length || 0}
          </span>
          <span className="stat-item">
            <StatThumbIcon direction="down" /> {post.votes?.downvotes?.length || 0}
          </span>
          <span className="stat-item">
            <FaComment /> {post.replies?.length || 0}
          </span>
          <span className="stat-item">
            <FaEye /> {post.views || 0}
          </span>
        </div>
        <Link to={`/post/${post._id}`} className="btn btn-outline btn-sm">
          Ver más
        </Link>
      </div>
    </div>
  );
};

export default PostCard;


