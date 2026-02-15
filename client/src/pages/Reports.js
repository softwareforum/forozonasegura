import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Reports.css';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/reports', { params: { status } });
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error obteniendo reportes:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['moderador', 'administrador'].includes(user.role)) {
      fetchReports();
    }
  }, [user, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const archiveReport = async (reportId) => {
    try {
      await axios.patch(`/api/reports/${reportId}`, { status: 'archived' });
      await fetchReports();
    } catch (error) {
      console.error('Error archivando reporte:', error);
    }
  };

  const approveReport = async (reportId) => {
    try {
      await axios.patch(`/api/reports/${reportId}`, { status: 'approved' });
      await fetchReports();
    } catch (error) {
      console.error('Error aprobando reporte:', error);
    }
  };

  const roleLabel = (role) =>
    role === 'facilita_espacio' ? 'Quien facilita el espacio' : 'Inquilino/a';

  if (!user || !['moderador', 'administrador'].includes(user.role)) {
    return (
      <div className="reports">
        <div className="access-denied">
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Cargando reportes...</div>;
  }

  return (
    <div className="reports">
      <h1>Canal de Denuncias</h1>
      <p className="page-subtitle">Reportes y denuncias de la comunidad</p>

      <div className="reports-toolbar">
        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Abiertos</option>
          <option value="approved">Aprobados</option>
          <option value="archived">Archivados</option>
        </select>
        <button type="button" className="btn btn-outline btn-sm" onClick={fetchReports}>Recargar</button>
      </div>

      {reports.length === 0 ? (
        <div className="no-reports">
          <p>No hay reportes en este estado.</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report._id} className="report-card">
              <div className="report-header">
                <div>
                  <h3>
                    <Link to={`/post/${report.postId?._id || report.postId}`}>
                      {report.postId?.title || 'Publicación'}
                    </Link>
                  </h3>
                  <p className="report-author">
                    Provincia: {report.postId?.location?.provincia || 'N/A'}
                  </p>
                </div>
                <span className={`badge ${report.status === 'archived' ? 'badge-secondary' : report.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                  {report.status === 'archived' ? 'Archivado' : report.status === 'approved' ? 'Aprobado' : 'Abierto'}
                </span>
              </div>

              <div className="report-details">
                <p><strong>Rol:</strong> {roleLabel(report.role)}</p>
                <p><strong>Motivo:</strong> {report.message}</p>
                <p><strong>Contacto:</strong> {report.reporter?.email || report.reporter?.phone || 'Sin contacto'}</p>
                <p><strong>Adjuntos:</strong> {report.attachments?.length || 0}</p>
                <p><strong>Fecha:</strong> {new Date(report.createdAt).toLocaleString('es-ES')}</p>
              </div>

              <div className="report-actions">
                <Link to={`/post/${report.postId?._id || report.postId}`} className="btn btn-outline btn-sm">
                  Ver Publicación
                </Link>
                {report.status === 'open' && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => approveReport(report._id)}>
                    Aprobar
                  </button>
                )}
                {report.status !== 'archived' && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => archiveReport(report._id)}>
                    Archivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;

