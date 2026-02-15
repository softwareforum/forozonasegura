import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getReputationRankInfo } from '../../utils/reputation';
import { DEFAULT_STATUS_EMOJI, DEFAULT_STATUS_PRESET, labelFromKey } from '../../utils/statusPresets';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, securityNotice, clearSecurityNotice } = useContext(AuthContext);
  const navigate = useNavigate();
  const rankInfo = getReputationRankInfo(user?.reputation || 0);
  const statusEmoji = user?.statusEmoji || DEFAULT_STATUS_EMOJI;
  const statusLabel = labelFromKey(user?.statusPreset || DEFAULT_STATUS_PRESET);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      {securityNotice && (
        <div className="security-notice" role="status">
          <span>{securityNotice}</span>
          <button type="button" className="security-notice-close" onClick={clearSecurityNotice}>
            Cerrar
          </button>
        </div>
      )}
      {user && user.isVerified === false && (
        <div className="security-notice" role="status">
          <span>⚠️ Verifica tu correo para acceder a todas las funciones</span>
          <Link to="/check-email" className="security-notice-close">Verificar</Link>
        </div>
      )}
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <h1>Foro Zona Segura</h1>
        </Link>

        <div className="navbar-menu">
          <Link to="/communities" className="navbar-link">Comunidades</Link>
          <Link to="/search" className="navbar-link">Buscar</Link>
          <Link to="/help" className="navbar-link">Dudas y normas</Link>
          <Link to="/professional-help" className="navbar-link">Ayuda a Profesionales</Link>
          {user && ['moderador', 'administrador'].includes(user.role) && (
            <>
              <Link to="/reports" className="navbar-link">Reportes</Link>
              <Link to="/moderation" className="navbar-link">Moderación</Link>
            </>
          )}
        </div>

        <div className="navbar-auth">
          {user ? (
            <div className="navbar-user">
              <Link
                to={`/profile/${user.id}`}
                className="btn btn--ghost btn--sm btn--nav navbar-user-btn"
                aria-label={`Ir al perfil de ${user.username}`}
              >
                <span className="navbar-user-main">{user.username}</span>
                <span className="navbar-user-rank">{rankInfo.name}</span>
                <span className="navbar-user-status">{statusEmoji} {statusLabel}</span>
                {user.role !== 'usuario' && (
                  <span className="badge badge-primary ml-1">{user.role}</span>
                )}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn--ghost btn--sm btn--nav navbar-user-btn"
                aria-label="Cerrar sesión"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm btn--nav">Iniciar Sesión</Link>
              <Link to="/register" className="btn btn--primary btn--sm btn--nav">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
