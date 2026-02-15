import React, { useState } from 'react';
import axios from 'axios';
import ServiciosCaracteristicasSection from './formSections/ServiciosCaracteristicasSection';
import ConvivenciaSection from './formSections/ConvivenciaSection';
import ExperienciaGeneralSection from './formSections/ExperienciaGeneralSection';
import CondicionesSection from './formSections/CondicionesSection';
import { normalizeServiciosObject } from '../utils/services';
import '../pages/CreatePost.css';

const INITIAL_FORM_DATA = {
  servicios: {
    cocinaDigna: false,
    banoDigno: false,
    fotosReales: false,
    conviveConDueno: false,
    sabanasYToallas: false,
    calefaccion: false,
    aguaCaliente: false,
    aireOAventilador: false,
    smartTv: false,
    malosOlores: false,
    wifi: false,
    ascensor: false,
    masDeUnPrimeroSinAscensor: false,
    problemasVecinos: false,
    trabaja24h: false,
    aceptaLgtbi: false,
    videoportero: false
  },
  anfitrion: {
    tieneVicios: 'no',
    acoso: 'nunca',
    caracter: 'neutro'
  },
  experiencia: {
    confort: 3,
    seguridadPercibida: 3
  },
  checkInOut: '',
  depositRequired: false,
  cleaningFrequency: ''
};

const ReplyForm = ({ postId, onReplyAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorList, setErrorList] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('servicios.')) {
      const servicioKey = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        servicios: {
          ...prev.servicios,
          [servicioKey]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }

    if (name.startsWith('anfitrion.')) {
      const anfitrionKey = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        anfitrion: {
          ...prev.anfitrion,
          [anfitrionKey]: value
        }
      }));
      return;
    }

    if (name.startsWith('experiencia.')) {
      const experienciaKey = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        experiencia: {
          ...prev.experiencia,
          [experienciaKey]: Number.parseInt(value, 10) || 0
        }
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDepositChange = (value) => {
    setFormData((prev) => ({ ...prev, depositRequired: Boolean(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorList([]);
    setLoading(true);

    if (!formData.checkInOut) {
      setError('El horario de entrada y salida es requerido');
      setErrorList(['El horario de entrada y salida es requerido']);
      setLoading(false);
      return;
    }

    if (formData.depositRequired === undefined || formData.depositRequired === null) {
      setError('Debes indicar si se requiere deposito');
      setErrorList(['Debes indicar si se requiere deposito']);
      setLoading(false);
      return;
    }

    if (!formData.cleaningFrequency) {
      setError('La frecuencia de limpieza es requerida');
      setErrorList(['La frecuencia de limpieza es requerida']);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        servicios: normalizeServiciosObject(formData.servicios),
        anfitrion: formData.anfitrion,
        experiencia: {
          confort: Number(formData.experiencia.confort),
          seguridadPercibida: Number(formData.experiencia.seguridadPercibida)
        },
        checkInOut: formData.checkInOut,
        depositRequired: Boolean(formData.depositRequired),
        cleaningFrequency: formData.cleaningFrequency
      };

      const response = await axios.post(`/api/posts/${postId}/replies`, payload);

      setFormData(INITIAL_FORM_DATA);
      setShowForm(false);

      if (onReplyAdded) {
        onReplyAdded(response.data.reply);
      }
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        const messages = backendErrors.map((item) => item.msg || item.message).filter(Boolean);
        setError(messages[0] || 'Error de validacion');
        setErrorList(messages.length > 0 ? messages : ['Error de validacion']);
      } else {
        const message = err.response?.data?.message || 'Error al crear experiencia';
        setError(message);
        setErrorList([message]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="reply-form-toggle" style={{ margin: '1rem 0' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Anadir experiencia
        </button>
      </div>
    );
  }

  return (
    <div className="create-post" style={{ maxWidth: '100%', padding: '1rem 0' }}>
      <div className="create-post-form">
        <h2 className="form-section-title" style={{ marginTop: 0 }}>Anadir experiencia</h2>

        {error && (
          <div
            className="alert alert-error"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px'
            }}
          >
            <div>{error}</div>
            {errorList.length > 1 && (
              <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                {errorList.map((msg, idx) => (
                  <li key={`${msg}-${idx}`}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-post-form" style={{ padding: '1.5rem' }}>
          <ServiciosCaracteristicasSection servicios={formData.servicios} onChange={handleChange} />

          <ConvivenciaSection anfitrion={formData.anfitrion} onChange={handleChange} />

          <ExperienciaGeneralSection experiencia={formData.experiencia} onChange={handleChange} />

          <CondicionesSection
            checkInOut={formData.checkInOut}
            depositRequired={formData.depositRequired}
            cleaningFrequency={formData.cleaningFrequency}
            onChange={handleChange}
            onDepositChange={handleDepositChange}
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar experiencia'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                setError('');
                setErrorList([]);
              }}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReplyForm;
