import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const MAX_FILES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf'
]);

const bytesToMb = (size) => `${(size / (1024 * 1024)).toFixed(2)} MB`;

const ReportModal = ({ isOpen, postId, onClose, initialEmail = '' }) => {
  const [form, setForm] = useState({
    role: '',
    name: '',
    email: initialEmail,
    phone: '',
    message: ''
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm((prev) => ({ ...prev, email: initialEmail || '' }));
  }, [initialEmail, isOpen]);

  const totalSize = useMemo(
    () => files.reduce((acc, file) => acc + file.size, 0),
    [files]
  );

  if (!isOpen) return null;

  const onFileChange = (event) => {
    setError('');
    const incoming = Array.from(event.target.files || []);
    const merged = [...files, ...incoming];

    if (merged.length > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} archivos.`);
      return;
    }

    const invalidType = merged.find((file) => !ALLOWED_TYPES.has(file.type));
    if (invalidType) {
      setError(`Tipo de archivo no permitido: ${invalidType.name}`);
      return;
    }

    const bigFile = merged.find((file) => file.size > MAX_FILE_SIZE);
    if (bigFile) {
      setError(`Archivo demasiado grande: ${bigFile.name}`);
      return;
    }

    const nextTotal = merged.reduce((acc, file) => acc + file.size, 0);
    if (nextTotal > MAX_TOTAL_SIZE) {
      setError(`El total supera ${bytesToMb(MAX_TOTAL_SIZE)}.`);
      return;
    }

    setFiles(merged);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if ((form.message || '').trim().length < 20) {
      setError('El motivo debe tener al menos 20 caracteres.');
      return;
    }
    if (!form.role) {
      setError('Selecciona tu rol en el reporte.');
      return;
    }

    const payload = new FormData();
    payload.append('role', form.role);
    payload.append('name', form.name);
    payload.append('email', form.email);
    payload.append('phone', form.phone);
    payload.append('message', form.message.trim());
    files.forEach((file) => payload.append('files', file));

    try {
      setLoading(true);
      await axios.post(`/api/posts/${postId}/report`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Reporte enviado. Gracias por avisar.');
      setFiles([]);
      setForm((prev) => ({ ...prev, role: '', message: '' }));
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Has realizado demasiadas acciones. Espera unos segundos.');
      } else if (err.response?.status === 400) {
        const backendErrors = err.response?.data?.errors;
        if (Array.isArray(backendErrors) && backendErrors.length > 0) {
          setError(backendErrors.map((item) => item.msg).join(' | '));
        } else {
          setError(err.response?.data?.message || 'Faltan campos o hay datos inválidos.');
        }
      } else {
        setError('No se pudo enviar el reporte. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-modal-overlay" role="dialog" aria-modal="true">
      <div className="report-modal-card">
        <div className="report-modal-header">
          <h3>Reportar publicación</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cerrar</button>
        </div>
        <p className="report-privacy-note">Tu identidad no se mostrará públicamente. No incluyas dirección exacta ni datos sensibles.</p>
        <form onSubmit={submit} className="report-form">
          <select
            className="form-select"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
          >
            <option value="">Selecciona tu rol</option>
            <option value="inquilino">Soy inquilino/a</option>
            <option value="facilita_espacio">Soy quien facilita el espacio</option>
          </select>
          <input
            className="form-input"
            placeholder="Nombre (opcional)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="report-form-grid">
            <input
              className="form-input"
              placeholder="Email (opcional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Teléfono (opcional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <textarea
            className="form-input"
            rows={4}
            placeholder="Motivo del reporte (mínimo 20 caracteres)"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <input
            className="form-input"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.pdf"
            onChange={onFileChange}
          />
          <div className="report-files-summary">
            {files.length} adjuntos - {bytesToMb(totalSize)}
          </div>
          {files.length > 0 && (
            <ul className="report-files-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>{file.name} ({bytesToMb(file.size)})</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removeFile(index)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="report-form-error">{error}</p>}
          {success && <p className="report-form-success">{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;

