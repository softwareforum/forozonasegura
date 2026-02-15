import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

const mapActivityItems = (activities) => activities.map((item) => {
  const username = item.actor?.username || 'Alguien';
  const province = item.post?.province || 'esta zona';
  const text = item.type === 'reply'
    ? `${username} comentó en un hilo en ${province}`
    : `${username} creó un hilo en ${province}`;

  return {
    _id: item._id,
    text,
    link: item.link || '/'
  };
});

const Home = () => {
  const { user } = useContext(AuthContext);
  const [followingActivities, setFollowingActivities] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [hideFollowingBlock, setHideFollowingBlock] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadFollowingActivity = async () => {
      if (!user) return;

      setFollowingLoading(true);
      try {
        const response = await axios.get('/api/activity/following', {
          params: { limit: 10 }
        });

        if (!mounted) return;
        setFollowingActivities(response.data?.activities || []);
      } catch (error) {
        if (!mounted) return;
        if (error?.response?.status === 401) {
          setHideFollowingBlock(true);
          return;
        }
        setFollowingActivities([]);
      } finally {
        if (mounted) {
          setFollowingLoading(false);
        }
      }
    };

    loadFollowingActivity();

    return () => {
      mounted = false;
    };
  }, []);

  const activityItems = useMemo(
    () => mapActivityItems(followingActivities),
    [followingActivities]
  );

  return (
    <div className="home">
      <div className="hero">
        <h1>Bienvenido a Foro Zona Segura</h1>
        <p className="hero-subtitle">
          Tu comunidad para encontrar y compartir información sobre pisos, plazas y clubes
        </p>
        {!user && (
          <div className="hero-actions">
            <Link to="/register" className="btn btn--primary">Crear cuenta</Link>
            <Link to="/login" className="btn btn--secondary">Iniciar Sesión</Link>
          </div>
        )}
      </div>

      <div className="home-sections">
        <div className="section-card">
          <h2>Pisos para independientes</h2>
          <p>Comparte y consulta experiencias sobre pisos para personas independientes</p>
        </div>

        <div className="section-card">
          <h2>Plazas</h2>
          <p>Comparte información sobre plazas </p>
        </div>

        <div className="section-card">
          <h2>Clubes / Locales</h2>
          <p>Discusiones y experiencias sobre clubes y locales</p>
        </div>
      </div>

      <div className="home-actions">
        <Link to="/communities" className="btn btn--primary btn--lg home-cta">
          Explorar comunidades
        </Link>
        {user && (
          <Link to="/create-post" className="btn btn--primary btn--lg home-cta">
            Crear publicación
          </Link>
        )}
      </div>

      {user && !hideFollowingBlock && (
        <section className="following-activity">
          <div className="following-activity__header">
            <h2>Actividad de personas que sigues</h2>
          </div>

          {followingLoading ? (
            <p className="following-activity__state">Cargando actividad...</p>
          ) : activityItems.length === 0 ? (
            <p className="following-activity__state">Sigue perfiles para ver su actividad reciente.</p>
          ) : (
            <ul className="following-activity__list">
              {activityItems.map((item) => (
                <li key={item._id} className="following-activity__item">
                  <span>{item.text}</span>
                  <Link to={item.link} className="following-activity__link">Ver</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default Home;
