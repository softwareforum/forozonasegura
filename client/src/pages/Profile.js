import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/Post/PostCard';
import { getReputationRankInfo } from '../utils/reputation';
import {
  STATUS_PRESETS,
  STATUS_EMOJIS,
  DEFAULT_STATUS_PRESET,
  DEFAULT_STATUS_EMOJI,
  labelFromKey
} from '../utils/statusPresets';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, updateUserData } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [statusPreset, setStatusPreset] = useState(DEFAULT_STATUS_PRESET);
  const [statusEmoji, setStatusEmoji] = useState(DEFAULT_STATUS_EMOJI);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [draftStatusPreset, setDraftStatusPreset] = useState(DEFAULT_STATUS_PRESET);
  const [draftStatusEmoji, setDraftStatusEmoji] = useState(DEFAULT_STATUS_EMOJI);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');

  const isOwnProfile = !!authUser && authUser.id === id;

  useEffect(() => {
    fetchProfile();
  }, [id, authUser]);

  useEffect(() => {
    if (!isEditingStatus) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCancelVisualStatus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditingStatus]);

  const fetchProfile = async () => {
    try {
      const [userResponse, postsResponse] = await Promise.all([
        axios.get(`/api/users/${id}`),
        axios.get(`/api/users/${id}/posts`)
      ]);
      const profileUser = userResponse.data.user;
      setUser(profileUser);
      setPosts(postsResponse.data.posts);
      setFollowersCount(profileUser?.followersCount || 0);
      setFollowingCount(profileUser?.followingCount || 0);

      const initialPreset = profileUser?.statusPreset || DEFAULT_STATUS_PRESET;
      const initialEmoji = profileUser?.statusEmoji || DEFAULT_STATUS_EMOJI;
      setStatusPreset(initialPreset);
      setStatusEmoji(initialEmoji);
      setDraftStatusPreset(initialPreset);
      setDraftStatusEmoji(initialEmoji);

      if (authUser && authUser.id !== id) {
        const followersResponse = await axios.get(`/api/users/${id}/followers`);
        const followers = followersResponse.data?.users || [];
        setIsFollowing(followers.some((item) => item._id === authUser.id));
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    try {
      setFollowLoading(true);
      setFollowError('');
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await axios.post(`/api/users/${id}/${endpoint}`);
      setIsFollowing(response.data.following);
      if (typeof response.data.followersCount === 'number') {
        setFollowersCount(response.data.followersCount);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setFollowError('No se pudo actualizar el seguimiento. Inténtalo de nuevo.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenVisualStatus = () => {
    setDraftStatusPreset(statusPreset || DEFAULT_STATUS_PRESET);
    setDraftStatusEmoji(statusEmoji || DEFAULT_STATUS_EMOJI);
    setStatusMessage('');
    setStatusError('');
    setIsEditingStatus(true);
  };

  const handleCancelVisualStatus = () => {
    setDraftStatusPreset(statusPreset || DEFAULT_STATUS_PRESET);
    setDraftStatusEmoji(statusEmoji || DEFAULT_STATUS_EMOJI);
    setStatusMessage('');
    setStatusError('');
    setIsEditingStatus(false);
  };

  const handleSaveVisualStatus = async () => {
    if (!isOwnProfile) return;
    setStatusSaving(true);
    setStatusMessage('');
    setStatusError('');

    try {
      const response = await axios.patch('/api/users/me/visual-status', {
        statusPreset: draftStatusPreset,
        statusEmoji: draftStatusEmoji
      });

      const nextPreset = response.data?.statusPreset || draftStatusPreset;
      const nextEmoji = response.data?.statusEmoji || draftStatusEmoji;

      setStatusPreset(nextPreset);
      setStatusEmoji(nextEmoji);
      setUser((prev) => (prev ? { ...prev, statusPreset: nextPreset, statusEmoji: nextEmoji } : prev));
      updateUserData({ statusPreset: nextPreset, statusEmoji: nextEmoji });
      setIsEditingStatus(false);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setStatusError('No se pudo guardar el estado.');
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando perfil...</div>;
  }

  if (!user) {
    return <div className="error">Usuario no encontrado</div>;
  }

  const rankInfo = getReputationRankInfo(user.reputation || 0);
  const resolvedStatusPreset = user.statusPreset || statusPreset || DEFAULT_STATUS_PRESET;
  const resolvedStatusEmoji = user.statusEmoji || statusEmoji || DEFAULT_STATUS_EMOJI;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-info">
          <h1>{user.username}</h1>
          <p className="profile-visual-status">
            Estado actual: {resolvedStatusEmoji} {labelFromKey(resolvedStatusPreset)}
          </p>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-label">Reputacion</span>
              <span className="stat-value">{user.reputation}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Rango</span>
              <span className="stat-value stat-value-text">{rankInfo.name}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Publicaciones</span>
              <span className="stat-value">{user.postCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Seguidores</span>
              <span className="stat-value">{followersCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Siguiendo</span>
              <span className="stat-value">{followingCount}</span>
            </div>
          </div>

          {!isOwnProfile && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? 'Actualizando...' : isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
              {followError && <p className="error" style={{ marginTop: '0.5rem' }}>{followError}</p>}
            </div>
          )}

          {isOwnProfile && (
            <div className="visual-status-actions">
              <button type="button" className="btn btn-outline" onClick={handleOpenVisualStatus}>
                Cambiar estado
              </button>
            </div>
          )}

          <div className="rank-progress">
            <div className="rank-progress-header">
              <span>Progreso del rango</span>
              <span>{rankInfo.displayProgress}</span>
            </div>
            <div
              className="rank-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={rankInfo.progressPercent}
            >
              <div className="rank-progress-fill" style={{ width: `${rankInfo.progressPercent}%` }} />
            </div>
          </div>

          <p className="profile-date">
            Miembro desde {new Date(user.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long'
            })}
          </p>
          {user.isVerified && (
            <span className="badge badge-success">Verificado</span>
          )}
        </div>
      </div>

      {isOwnProfile && isEditingStatus && (
        <div
          className="status-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Editar estado"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCancelVisualStatus();
            }
          }}
        >
          <div className="status-modal-card">
            <h3>Editar estado</h3>

            <div className="form-group">
              <label className="form-label" htmlFor="statusPreset">Estado predefinido</label>
              <select
                id="statusPreset"
                className="form-select"
                value={draftStatusPreset}
                onChange={(e) => setDraftStatusPreset(e.target.value)}
              >
                {STATUS_PRESETS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div className="emoji-grid" role="listbox" aria-label="Seleccion de emoji">
                {STATUS_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-btn ${draftStatusEmoji === emoji ? 'selected' : ''}`}
                    onClick={() => setDraftStatusEmoji(emoji)}
                    aria-label={`Seleccionar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <p className="status-preview">Vista previa: {draftStatusEmoji} {labelFromKey(draftStatusPreset)}</p>

            <div className="status-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveVisualStatus}
                disabled={statusSaving}
              >
                {statusSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCancelVisualStatus}
                disabled={statusSaving}
              >
                Cancelar
              </button>
            </div>

            {statusMessage && <p className="status-success">{statusMessage}</p>}
            {statusError && <p className="status-error">{statusError}</p>}
          </div>
        </div>
      )}

      <div className="profile-posts">
        <h2>Publicaciones</h2>
        {posts.length > 0 ? (
          <div className="posts-list">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <p className="no-posts">Este usuario no ha publicado nada aun.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
