import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/Post/PostCard';
import PostsMapView from '../components/maps/PostsMapView';
import { slugify } from '../utils/slug';
import './ProvincePosts.css';

const ProvincePosts = () => {
  const { slug, provinciaSlug } = useParams();
  const [ccaa, setCcaa] = useState(null);
  const [provincia, setProvincia] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('recent');
  const [tipoEspacio, setTipoEspacio] = useState('');
  const [search, setSearch] = useState('');
  const [mapBbox, setMapBbox] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasTriggeredInitialMapFetch, setHasTriggeredInitialMapFetch] = useState(false);

  const countGeoPosts = (items = []) =>
    items.filter((post) => {
      const center = post?.location?.geo?.center?.coordinates;
      if (Array.isArray(center) && center.length === 2) {
        return Number.isFinite(Number(center[0])) && Number.isFinite(Number(center[1]));
      }
      return Number.isFinite(Number(post?.location?.geo?.lat)) && Number.isFinite(Number(post?.location?.geo?.lng));
    }).length;

  const resolveTerritory = useCallback(async () => {
    const response = await axios.get('/api/meta/territory');
    const comunidades = response.data?.comunidadesAutonomas || [];
    const foundCcaa = comunidades.find((item) => item.slug === slug);
    const foundProvincia = foundCcaa?.provincias?.find((p) => slugify(p) === provinciaSlug);
    setCcaa(foundCcaa || null);
    setProvincia(foundProvincia || '');
    return { foundCcaa, foundProvincia };
  }, [provinciaSlug, slug]);

  const fetchPosts = useCallback(async (bbox = null) => {
    setLoading(true);
    try {
      const { foundProvincia } = await resolveTerritory();
      if (!foundProvincia) {
        setPosts([]);
        setTotalPages(1);
        return;
      }

      const params = {
        community: foundProvincia,
        sort,
        page,
        limit: viewMode === 'map' ? 200 : 20
      };
      if (tipoEspacio) params.tipoEspacio = tipoEspacio;
      if (search.trim()) params.search = search.trim();
      if (viewMode === 'map' && bbox) params.bbox = bbox;

      const response = await axios.get('/api/posts', { params });
      setPosts(response.data?.posts || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      if (process.env.NODE_ENV !== 'production') {
        const geoCount = countGeoPosts(response.data?.posts || []);
        console.log('[ProvincePosts map-debug]', {
          provincia: foundProvincia,
          bbox: bbox || null,
          totalPosts: (response.data?.posts || []).length,
          geoUsable: geoCount
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Error cargando publicaciones de provincia:', error);
      }
      setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [resolveTerritory, sort, page, viewMode, tipoEspacio, search]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchPosts(null);
      return;
    }
    if (mapBbox) {
      fetchPosts(mapBbox);
    }
  }, [fetchPosts, mapBbox, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode !== 'map') {
      setHasTriggeredInitialMapFetch(false);
      return;
    }
    setHasTriggeredInitialMapFetch(true);
  }, [viewMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPage(1);
    await fetchPosts(viewMode === 'map' ? mapBbox : null);
  };

  const handleMapBoundsChange = async (bbox) => {
    if (!bbox || bbox === mapBbox) return;
    setMapBbox(bbox);
    if (!hasTriggeredInitialMapFetch) {
      setHasTriggeredInitialMapFetch(true);
    }
  };

  if (loading) {
    return <div className="loading">Cargando publicaciones...</div>;
  }

  if (!ccaa || !provincia) {
    return <div className="error">Provincia no encontrada</div>;
  }

  return (
    <div className="province-posts-page">
      <nav className="breadcrumb">
        <Link to="/communities">Comunidades</Link>
        <span> / </span>
        <Link to={`/communities/${ccaa.slug}`}>{ccaa.name}</Link>
        <span> / </span>
        <span>{provincia}</span>
      </nav>

      <div className="province-header">
        <h1>Publicaciones en {provincia}</h1>
        <div className="province-actions">
          <button
            type="button"
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('list')}
          >
            Lista
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('map')}
          >
            Mapa
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="province-filters">
        <input
          type="text"
          className="form-input"
          placeholder="Buscar por título o contenido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" value={tipoEspacio} onChange={(e) => setTipoEspacio(e.target.value)}>
          <option value="">Todos los espacios</option>
          <option value="piso_independiente">Piso independiente</option>
          <option value="club_o_plaza">Club o plaza</option>
        </select>
        <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="best">Mejor valorados</option>
          <option value="worst">Peor valorados</option>
        </select>
        <button type="submit" className="btn btn-primary">Aplicar</button>
      </form>

      {viewMode === 'map' ? (
        <>
          <PostsMapView
            posts={posts}
            onBoundsChange={handleMapBoundsChange}
            selectedProvincia={provincia}
          />
          {countGeoPosts(posts) === 0 && (
            <div className="no-posts" style={{ marginTop: '1rem' }}>
              <h3>No hay publicaciones con mapa en esta zona todavía</h3>
              <p>Prueba mover el mapa o revisa la vista de lista.</p>
            </div>
          )}
        </>
      ) : (
        <div className="posts-list">
          {posts.length > 0 ? (
            posts.map((post) => <PostCard key={post._id} post={post} />)
          ) : (
            <div className="no-posts">
              <h3>No hay publicaciones en esta provincia</h3>
              <p>Prueba con otro orden o filtros.</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-outline"
          >
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-outline"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProvincePosts;

