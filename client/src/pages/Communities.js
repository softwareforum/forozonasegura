import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Communities.css';

const Communities = () => {
  const [comunidadesAutonomas, setComunidadesAutonomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTerritory = async () => {
      try {
        const response = await axios.get('/api/meta/territory');
        if (response.data.success) {
          setComunidadesAutonomas(response.data.comunidadesAutonomas || []);
        } else {
          setError('Error al cargar el territorio');
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Error obteniendo territorio:', err);
        }
        setError('No se pudo cargar el catalogo territorial.');
      } finally {
        setLoading(false);
      }
    };

    fetchTerritory();
  }, []);

  if (loading) {
    return (
      <div className="communities">
        <div className="loading">Cargando CCAA...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="communities">
        <h1>Comunidades Autonomas</h1>
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="communities">
      <h1>Comunidades Autonomas</h1>
      <p className="page-subtitle">Selecciona una CCAA para explorar sus provincias</p>

      <div className="communities-grid">
        {comunidadesAutonomas.map((ccaa) => (
          <Link key={ccaa.slug} to={`/communities/${ccaa.slug}`} className="community-card">
            <h2>{ccaa.name}</h2>
            <p>{ccaa.provincias?.length || 0} provincias</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Communities;
