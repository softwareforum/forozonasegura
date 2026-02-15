import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ModerationPanel.css';

const ModerationPanel = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && ['moderador', 'administrador'].includes(user.role)) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/moderation/logs');
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error obteniendo logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['moderador', 'administrador'].includes(user.role)) {
    return (
      <div className="moderation-panel">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  const actionLabels = {
    delete_post: 'Eliminar Publicación',
    delete_reply: 'Eliminar Respuesta',
    ban_user: 'Banear Usuario',
    unban_user: 'Desbanear Usuario',
    lock_post: 'Bloquear Publicación',
    unlock_post: 'Desbloquear Publicación',
    pin_post: 'Fijar Publicación',
    unpin_post: 'Desfijar Publicación',
    warn_user: 'Advertir Usuario'
  };

  return (
    <div className="moderation-panel">
      <h1>Panel de Moderación</h1>
      <p className="page-subtitle">Registro de acciones de moderación</p>

      <div className="moderation-logs">
        {logs.length === 0 ? (
          <div className="no-logs">No hay registros de moderación.</div>
        ) : (
          logs.map(log => (
            <div key={log._id} className="log-card">
              <div className="log-header">
                <div>
                  <h3>{actionLabels[log.action] || log.action}</h3>
                  <p className="log-moderator">Por: {log.moderator?.username}</p>
                </div>
                <span className="badge badge-primary">{log.targetType}</span>
              </div>
              <div className="log-details">
                <p><strong>Razón:</strong> {log.reason}</p>
                <p><strong>Fecha:</strong> {new Date(log.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModerationPanel;

