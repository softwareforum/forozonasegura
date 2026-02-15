import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { normalizeServiciosObject } from '../utils/services';
import ServiciosCaracteristicasSection from '../components/formSections/ServiciosCaracteristicasSection';
import ConvivenciaSection from '../components/formSections/ConvivenciaSection';
import ExperienciaGeneralSection from '../components/formSections/ExperienciaGeneralSection';
import CondicionesSection from '../components/formSections/CondicionesSection';
import UbicacionSection from '../components/formSections/UbicacionSection';
import MapPicker from '../components/maps/MapPicker';
import './CreatePost.css';

const CreatePost = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    // BÃ¡sicos
    tipoEspacio: 'piso_independiente',
    
    // UbicaciÃ³n
    provincia: '',
    geo: {
      center: null,
      radiusMeters: 600
    },
    
    // Servicios (checkboxes) - sin campos de texto
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
    
    // AnfitriÃ³n - sin campos de texto
    anfitrion: {
      tieneVicios: 'no',
      acoso: 'nunca',
      caracter: 'neutro'
    },
    
    // Experiencia - sin campos de texto
    experiencia: {
      confort: 3,
      seguridadPercibida: 3
    },
    
    // Condiciones
    checkInOut: '',
    depositRequired: false,
    cleaningFrequency: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [areaPreview, setAreaPreview] = useState('');
  const [loadingAreaPreview, setLoadingAreaPreview] = useState(false);
  const reverseCacheRef = useRef(new Map());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const center = formData.geo?.center;

    if (!center) {
      setAreaPreview('');
      setLoadingAreaPreview(false);
      return undefined;
    }

    const key = `${Number(center.lat).toFixed(4)},${Number(center.lng).toFixed(4)}`;
    const now = Date.now();
    const cached = reverseCacheRef.current.get(key);
    if (cached && cached.expiresAt > now) {
      setAreaPreview(cached.area || '');
      setLoadingAreaPreview(false);
      return undefined;
    }

    const controller = new AbortController();
    const fetchArea = async () => {
      setLoadingAreaPreview(true);
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          lat: String(center.lat),
          lon: String(center.lng)
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json'
          }
        });
        if (!response.ok) {
          setAreaPreview('');
          return;
        }
        const data = await response.json();
        const address = data?.address || {};
        const area = (
          address.neighbourhood ||
          address.suburb ||
          address.city_district ||
          address.quarter ||
          address.village ||
          address.town ||
          address.municipality ||
          address.county ||
          ''
        ).trim();
        reverseCacheRef.current.set(key, {
          area: area || '',
          expiresAt: now + 60 * 60 * 1000
        });
        setAreaPreview(area || '');
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setAreaPreview('');
        }
      } finally {
        setLoadingAreaPreview(false);
      }
    };
    fetchArea();

    return () => controller.abort();
  }, [formData.geo?.center]);

  // Manejar cambios en campos simples
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('servicios.')) {
      const servicioKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        servicios: {
          ...prev.servicios,
          [servicioKey]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('anfitrion.')) {
      const anfitrionKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        anfitrion: {
          ...prev.anfitrion,
          [anfitrionKey]: value
        }
      }));
    } else if (name.startsWith('experiencia.')) {
      const experienciaKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        experiencia: {
          ...prev.experiencia,
          [experienciaKey]: Number.parseInt(value, 10) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleDepositChange = (value) => {
    setFormData(prev => ({ ...prev, depositRequired: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ValidaciÃ³n bÃ¡sica
    if (!formData.provincia) {
      setError('Debes seleccionar una provincia');
      setLoading(false);
      return;
    }

    // ValidaciÃ³n de campos de condiciones
    if (!formData.checkInOut) {
      setError('El horario de entrada y salida es requerido');
      setLoading(false);
      return;
    }

    if (formData.depositRequired === undefined || formData.depositRequired === null) {
      setError('Debes indicar si se requiere depósito');
      setLoading(false);
      return;
    }

    if (!formData.cleaningFrequency) {
      setError('La frecuencia de limpieza es requerida');
      setLoading(false);
      return;
    }

    if (!formData.geo?.center) {
      setError('Debes marcar una zona en el mapa');
      setLoading(false);
      return;
    }

    try {
      const title = areaPreview
        ? `Zona ${areaPreview} en ${formData.provincia}`
        : `Zona en ${formData.provincia}`;

      // Preparar datos para enviar
      const postPayload = {
        title: title,
        tipoEspacio: formData.tipoEspacio,
        location: {
          provincia: formData.provincia,
          geo: {
            center: {
              type: 'Point',
              coordinates: [formData.geo.center.lng, formData.geo.center.lat]
            },
            radiusMeters: Number(formData.geo.radiusMeters || 600)
          }
        },
        servicios: normalizeServiciosObject(formData.servicios),
        anfitrion: formData.anfitrion,
        experiencia: {
          confort: Number(formData.experiencia.confort),
          seguridadPercibida: Number(formData.experiencia.seguridadPercibida)
        },
        checkInOut: formData.checkInOut,
        depositRequired: formData.depositRequired,
        cleaningFrequency: formData.cleaningFrequency,
        // Compatibilidad: mapear a campos antiguos
        category: formData.tipoEspacio === 'club_o_plaza' ? 'club' : 'piso',
        community: formData.provincia
      };

      const response = await axios.post('/api/posts', postPayload);
      navigate(`/post/${response.data.post._id}`);
    } catch (error) {
      console.error('Error creando post:', error);
      setError(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Error al crear publicación');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="create-post">
      <h1>Crear publicación</h1>
      
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="create-post-form">
        {/* SECCIÃ“N 1: InformaciÃ³n BÃ¡sica */}
        <section className="form-section">
          <h2 className="form-section-title">Información básica</h2>
          
          <div className="form-group">
            <label className="form-label">Tipo de espacio *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="tipoEspacio"
                  value="piso_independiente"
                  checked={formData.tipoEspacio === 'piso_independiente'}
                  onChange={handleChange}
                  required
                />
                <span>Piso independiente</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="tipoEspacio"
                  value="club_o_plaza"
                  checked={formData.tipoEspacio === 'club_o_plaza'}
                  onChange={handleChange}
                />
                <span>Club / Plaza</span>
              </label>
            </div>
            <small className="form-hint">El título se generará automáticamente con zona y provincia.</small>
          </div>
        </section>

        {/* SECCIÃ“N 2: UbicaciÃ³n */}
        <UbicacionSection
          provincia={formData.provincia}
          onChange={handleChange}
        />

        <section className="form-section">
          <h2 className="form-section-title">Mapa de zona (privacidad)</h2>
          <MapPicker
            value={formData.geo}
            selectedProvincia={formData.provincia}
            radiusMeters={Number(formData.geo?.radiusMeters || 600)}
            onChange={(geo) => setFormData((prev) => ({ ...prev, geo }))}
          />
          <div className="title-preview">
            {loadingAreaPreview
              ? 'Generando título de zona...'
              : (
                areaPreview
                  ? `Vista previa: Zona ${areaPreview} en ${formData.provincia || 'la provincia seleccionada'}`
                  : `Vista previa: Zona en ${formData.provincia || 'la provincia seleccionada'}`
              )}
          </div>
        </section>

        {/* SECCIÃ“N 3: Servicios del Espacio */}
        <ServiciosCaracteristicasSection
          servicios={formData.servicios}
          onChange={handleChange}
        />

        {/* SECCIÃ“N 4: Convivencia y AnfitriÃ³n */}
        <ConvivenciaSection
          anfitrion={formData.anfitrion}
          onChange={handleChange}
        />

        {/* SECCIÃ“N 5: Experiencia General */}
        <ExperienciaGeneralSection
          experiencia={formData.experiencia}
          onChange={handleChange}
        />

        {/* SECCIÃ“N 6: Condiciones */}
        <CondicionesSection
          checkInOut={formData.checkInOut}
          depositRequired={formData.depositRequired}
          cleaningFrequency={formData.cleaningFrequency}
          onChange={handleChange}
          onDepositChange={handleDepositChange}
        />

        {/* Botones de acciÃ³n */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Publicando...' : 'Crear publicación'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;


