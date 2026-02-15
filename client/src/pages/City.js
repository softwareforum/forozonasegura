import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { slugify } from '../utils/slug';
import { SUBZONAS_ESPECIALES } from '../constants/subzonasEspeciales';
import { resolveCcaaSlugByProvincia } from '../constants/provinceToCcaa';
import './City.css';

const City = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [ccaa, setCcaa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [legacyError, setLegacyError] = useState('');

  useEffect(() => {
    const fetchTerritory = async () => {
      try {
        const response = await axios.get('/api/meta/territory');
        const comunidades = response.data?.comunidadesAutonomas || [];
        const foundCcaa = comunidades.find((item) => item.slug === slug);
        if (foundCcaa) {
          setCcaa(foundCcaa);
          setLegacyError('');
          return;
        }

        // Compatibilidad legacy: /communities/:provincia -> redirigir a /communities/:ccaa/:provincia
        const ccaaSlug = resolveCcaaSlugByProvincia(slug);
        if (ccaaSlug) {
          navigate(`/communities/${ccaaSlug}/${slugify(slug)}`, { replace: true });
          return;
        }

        setCcaa(null);
        setLegacyError('No se encontro una CCAA para esa provincia.');
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Error obteniendo CCAA:', error);
        }
        setCcaa(null);
        setLegacyError('No se pudo resolver la ruta de comunidad.');
      } finally {
        setLoading(false);
      }
    };

    fetchTerritory();
  }, [navigate, slug]);

  if (loading) {
    return <div className="loading">Cargando provincias...</div>;
  }

  if (!ccaa) {
    return (
      <div className="error">
        {legacyError || 'CCAA no encontrada'} <Link to="/communities">Volver a Comunidades</Link>
      </div>
    );
  }

  const provincias = ccaa.provincias || [];
  const isSingleProvince = provincias.length === 1;
  const provinciaUnica = isSingleProvince ? provincias[0] : '';
  const subzonas = isSingleProvince
    ? (
      SUBZONAS_ESPECIALES[provinciaUnica]
      || SUBZONAS_ESPECIALES[ccaa.name]
      || []
    )
    : [];

  return (
    <div className="city-page">
      <Link to="/communities" className="back-link">Volver a Comunidades</Link>
      <h1>{ccaa.name}</h1>
      <p className="page-subtitle">
        {isSingleProvince ? 'Selecciona una subzona' : 'Selecciona una provincia'}
      </p>

      {!isSingleProvince && (
        <div className="cities-grid">
          {provincias.map((provincia) => (
            <Link
              key={provincia}
              to={`/communities/${ccaa.slug}/${slugify(provincia)}`}
              className="city-section"
            >
              <h2>{provincia}</h2>
              <p>Ver publicaciones de la provincia</p>
            </Link>
          ))}
        </div>
      )}

      {isSingleProvince && (
        <div className="cities-grid">
          {subzonas.map((subzona) => (
            <Link
              key={subzona}
              to={`/search?view=map&provincia=${encodeURIComponent(provinciaUnica)}&subzona=${encodeURIComponent(subzona)}`}
              className="city-section"
            >
              <h2>{subzona}</h2>
              <p>Explorar subzona</p>
            </Link>
          ))}

          <Link
            to={`/search?view=map&provincia=${encodeURIComponent(provinciaUnica)}&subzona=resto`}
            className="city-section"
          >
            <h2>Resto de {provinciaUnica}</h2>
            <p>Explorar resto de la provincia</p>
          </Link>
        </div>
      )}
    </div>
  );
};

export default City;
