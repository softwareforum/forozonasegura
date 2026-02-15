import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ResourceSubmissionsAdmin.css';

const ResourceSubmissionsAdmin = () => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canManage = !!user && ['moderador', 'administrador'].includes(user.role);

  const fetchItems = async () => {
    if (!canManage) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/professional-resources/submissions', {
        params: { status, page: 1, limit: 50 }
      });
      setItems(response.data?.submissions || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron cargar las solicitudes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id, nextStatus) => {
    try {
      await axios.patch(`/api/professional-resources/submissions/${id}`, { status: nextStatus });
      await fetchItems();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo actualizar el estado.');
    }
  };

  if (!canManage) {
    return (
      <div className="resource-admin-page">
        <div className="access-denied">
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para gestionar recursos profesionales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-admin-page">
      <h1>Solicitudes de Recursos</h1>
      <p className="page-subtitle">Panel básico para aprobar o rechazar recursos enviados.</p>

      <div className="admin-toolbar">
        <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobados</option>
          <option value="rejected">Rechazados</option>
        </select>
        <button type="button" className="btn btn-outline btn-sm" onClick={fetchItems}>Recargar</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando solicitudes...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No hay solicitudes en este estado.</div>
      ) : (
        <div className="submissions-list">
          {items.map((item) => (
            <article key={item.id} className="submission-card">
              <header>
                <h3>{item.entityName}</h3>
                <span className={`badge ${item.status === 'approved' ? 'badge-success' : item.status === 'rejected' ? 'badge-danger' : 'badge-secondary'}`}>
                  {item.status}
                </span>
              </header>
              <p><strong>Tipo:</strong> {item.resourceTypeLabel}</p>
              <p><strong>Cobertura:</strong> {item.coverageLabel}</p>
              <p><strong>Ciudad/Provincia:</strong> {item.cityProvince}</p>
              <p><strong>Descripción:</strong> {item.description}</p>
              <p><strong>Contacto:</strong> {item.email || item.phone || 'No disponible'}</p>
              <p><strong>Web:</strong> {item.website || 'No disponible'}</p>
              <p><strong>Fecha:</strong> {new Date(item.createdAt).toLocaleString('es-ES')}</p>

              <div className="actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(item.id, 'approved')}>
                  Aprobar
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => updateStatus(item.id, 'rejected')}>
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceSubmissionsAdmin;

