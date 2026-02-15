import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ProfessionalHelp.css';

const FALLBACK_CATEGORIES = [
  {
    id: 'emergencia_seguridad',
    title: 'Emergencia y seguridad',
    description: 'Recursos inmediatos ante riesgo o situación de peligro.'
  },
  {
    id: 'violencia_proteccion',
    title: 'Violencia y protección',
    description: 'Orientación para protegerte y activar apoyo especializado.'
  },
  {
    id: 'salud_sexual_mental',
    title: 'Salud sexual y mental',
    description: 'Atención sanitaria, salud mental y seguimiento profesional.'
  },
  {
    id: 'asesoria_legal_derechos',
    title: 'Asesoría legal y derechos',
    description: 'Información jurídica y defensa de derechos.'
  },
  {
    id: 'acompanamiento_social',
    title: 'Acompañamiento social / ayudas',
    description: 'Recursos de apoyo social y acceso a ayudas.'
  },
  {
    id: 'migracion_regularizacion',
    title: 'Migración y regularización',
    description: 'Apoyo para extranjería, regularización y trámites.'
  },
  {
    id: 'adicciones_reduccion_dano',
    title: 'Adicciones / reducción de daño',
    description: 'Programas de reducción de daño y apoyo terapéutico.'
  },
  {
    id: 'lgtbi_apoyo',
    title: 'LGTBIQ+ / apoyo específico',
    description: 'Recursos con enfoque inclusivo y especializado.'
  }
];

const TYPE_OPTIONS = [
  { value: 'ong', label: 'ONG' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'asesoria_legal', label: 'Asesoría legal' },
  { value: 'psicologia', label: 'Psicología' },
  { value: 'trabajo_social', label: 'Trabajo social' },
  { value: 'otro', label: 'Otro' }
];

const COVERAGE_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'online', label: 'Online' }
];

const initialForm = {
  entityName: '',
  resourceType: 'ong',
  cityProvince: '',
  coverage: 'local',
  website: '',
  phone: '',
  email: '',
  description: '',
  consent: false
};

const ProfessionalHelp = () => {
  const { user } = useContext(AuthContext);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [resourcesByCategory, setResourcesByCategory] = useState({});
  const [activeCategory, setActiveCategory] = useState(FALLBACK_CATEGORIES[0].id);
  const [loadingResources, setLoadingResources] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const formRef = useRef(null);

  const canManageResources = useMemo(
    () => !!user && ['moderador', 'administrador'].includes(user.role),
    [user]
  );

  useEffect(() => {
    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        const response = await axios.get('/api/professional-resources');
        const backendCategories = response.data?.categories || [];
        const backendByCategory = response.data?.resourcesByCategory || {};

        if (backendCategories.length > 0) {
          setCategories(backendCategories.map((category) => ({
            id: category.id,
            title: category.title,
            description: category.description
          })));
          setActiveCategory(backendCategories[0].id);
        }
        setResourcesByCategory(backendByCategory);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Error cargando recursos profesionales', error?.response?.status || error.message);
        }
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, []);

  const getCategoryResources = (categoryId) => {
    const bucket = resourcesByCategory?.[categoryId];
    return bucket?.resources || [];
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const parseBackendErrors = (error) => {
    const status = error?.response?.status;
    const payload = error?.response?.data;

    if (status === 429) {
      return 'Has realizado demasiadas acciones. Espera unos segundos.';
    }

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.map((item) => item.msg).join(' | ');
    }

    return payload?.message || 'No se pudo enviar la solicitud. Revisa los campos e inténtalo de nuevo.';
  };

  const validateForm = () => {
    if (!formData.entityName.trim()) return 'El nombre de la entidad es obligatorio.';
    if (!formData.cityProvince.trim()) return 'La ciudad/provincia es obligatoria.';
    const descriptionLength = formData.description.trim().length;
    if (descriptionLength < 20) return 'La descripción debe tener al menos 20 caracteres.';
    if (descriptionLength > 800) return 'La descripción no puede superar 800 caracteres.';
    if (!formData.consent) return 'Debes confirmar que el recurso es real.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/professional-resources/submissions', {
        ...formData,
        entityName: formData.entityName.trim(),
        cityProvince: formData.cityProvince.trim(),
        website: formData.website.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        description: formData.description.trim()
      });
      setSubmitSuccess('Solicitud enviada. El equipo de Zona Segura te contactará pronto.');
      setFormData(initialForm);
    } catch (error) {
      setSubmitError(parseBackendErrors(error));
      if (process.env.NODE_ENV !== 'production') {
        console.log('Error enviando recurso profesional', error?.response?.status || error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="professional-help">
      <h1>Recursos de apoyo</h1>
      <p className="page-subtitle">
        Recursos de reducción de daño, apoyo, derechos y seguridad para personas en situación de vulnerabilidad.
      </p>

      <div className="purpose-banner" role="note" aria-label="Aviso de uso responsable">
        <p><strong>Esta plataforma no promueve el trabajo sexual.</strong> Es un punto de acceso a recursos y apoyo.</p>
        <p>Si estás en peligro inmediato, llama al <strong>112</strong>.</p>
      </div>

      {canManageResources && (
        <div className="admin-shortcut">
          <Link to="/professional-help/submissions" className="btn btn-outline btn-sm">
            Gestionar solicitudes de recursos
          </Link>
        </div>
      )}

      <section>
        <h2>Recursos por categorías</h2>
        <div className="professional-sections">
          {categories.map((category) => {
            const resources = getCategoryResources(category.id);
            const isActive = activeCategory === category.id;
            return (
              <article key={category.id} className={`professional-card ${isActive ? 'active' : ''}`}>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveCategory(category.id)}
                  >
                    Ver recursos
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={scrollToForm}
                  >
                    Contactar
                  </button>
                </div>
                {isActive && (
                  <div className="resource-list">
                    {loadingResources ? (
                      <p>Cargando recursos...</p>
                    ) : resources.length === 0 ? (
                      <p>Próximamente: aún no hay recursos publicados en esta categoría.</p>
                    ) : (
                      resources.map((resource) => (
                        <div key={resource.id} className="resource-item">
                          <strong>{resource.entityName}</strong>
                          <span>{resource.resourceTypeLabel} · {resource.cityProvince} · {resource.coverageLabel}</span>
                          <p>{resource.description}</p>
                          <div className="resource-links">
                            {resource.website && (
                              <a href={resource.website} target="_blank" rel="noreferrer">Web</a>
                            )}
                            {resource.email && <span>{resource.email}</span>}
                            {resource.phone && <span>{resource.phone}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="faq-section">
        <h2>Preguntas frecuentes</h2>
        <div className="faq-grid">
          <article>
            <h3>¿Qué tipo de ayuda puedo encontrar aquí?</h3>
            <p>Recursos de emergencia, salud, asesoría legal, acompañamiento social y seguridad comunitaria.</p>
          </article>
          <article>
            <h3>¿Esto sustituye una denuncia o un servicio de emergencia?</h3>
            <p>No. Si existe riesgo inmediato debes llamar al 112 y usar los canales oficiales de emergencia.</p>
          </article>
          <article>
            <h3>¿Cómo reporto un anuncio peligroso?</h3>
            <p>Usa el botón Reportar en la publicación e incluye evidencias claras para facilitar la revisión.</p>
          </article>
          <article>
            <h3>¿Cómo añado un recurso u ONG a la lista?</h3>
            <p>Rellena el formulario de esta página. Se revisa y solo se publica cuando quede aprobado.</p>
          </article>
        </div>
      </section>

      <section className="resource-form-section" ref={formRef}>
        <h2>¿Eres una asociación o servicio? Añadir un recurso</h2>
        <p className="form-subtitle">Las solicitudes se revisan en privado antes de aparecer en el listado público.</p>

        {submitError && <div className="alert alert-error">{submitError}</div>}
        {submitSuccess && (
          <div className="submission-feedback">
            <span className="pending-badge">Pendiente de revisión</span>
            <div className="alert alert-success">{submitSuccess}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="resource-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre de la entidad</label>
              <input
                type="text"
                name="entityName"
                className="form-input"
                value={formData.entityName}
                onChange={onChange}
                required
                maxLength={120}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de recurso</label>
              <select
                name="resourceType"
                className="form-select"
                value={formData.resourceType}
                onChange={onChange}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ciudad / Provincia</label>
              <input
                type="text"
                name="cityProvince"
                className="form-input"
                value={formData.cityProvince}
                onChange={onChange}
                required
                maxLength={120}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cobertura</label>
              <select
                name="coverage"
                className="form-select"
                value={formData.coverage}
                onChange={onChange}
              >
                {COVERAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Web (opcional)</label>
              <input
                type="url"
                name="website"
                className="form-input"
                value={formData.website}
                onChange={onChange}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono (opcional)</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email (opcional)</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={onChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción corta</label>
            <textarea
              name="description"
              className="form-input"
              value={formData.description}
              onChange={onChange}
              required
              rows={4}
              maxLength={800}
            />
            <small>{formData.description.length}/800</small>
          </div>

          <label className="consent-row">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={onChange}
              required
            />
            <span>Confirmo que este recurso es real y acepto ser contactado.</span>
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar recurso'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfessionalHelp;



