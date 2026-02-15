import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/Post/PostCard';
import PostsMapView from '../components/maps/PostsMapView';
import './Category.css';

const Category = () => {
  const { slug, citySlug, category } = useParams();
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [community, setCommunity] = useState(null);
  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('recent');
  const [tipoEspacio, setTipoEspacio] = useState('');
  const [mapBbox, setMapBbox] = useState('');

  const isZonaSegura = category === 'zona-segura';
  const isZonaNoSegura = category === 'zona-no-segura';

  const fetchData = useCallback(
    async (bbox = null) => {
      setLoading(true);
      try {
        const commResponse = await axios.get(`/api/communities/${slug}`);
        setCommunity(commResponse.data.community);
        const foundCity = commResponse.data.community.cities.find((c) => c.slug === citySlug);
        setCity(foundCity);

        if (!foundCity) {
          setLoading(false);
          return;
        }

        const params = {
          community: commResponse.data.community.name,
          city: foundCity.name,
          zonaSegura: isZonaSegura.toString(),
          sort,
          page,
          limit: viewMode === 'map' ? 200 : 20
        };
        if (tipoEspacio) params.tipoEspacio = tipoEspacio;
        if (bbox) params.bbox = bbox;

        const postsResponse = await axios.get('/api/posts', { params });
        setPosts(postsResponse.data.posts || []);
        setTotalPages(postsResponse.data.pagination?.pages || 1);
      } catch (error) {
        console.error('Error obteniendo datos:', error);
        setPosts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [slug, citySlug, isZonaSegura, page, viewMode, sort, tipoEspacio]
  );

  useEffect(() => {
    if (isZonaSegura || isZonaNoSegura) {
      fetchData(viewMode === 'map' ? mapBbox : null);
    }
  }, [slug, citySlug, category, page, isZonaSegura, isZonaNoSegura, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapBoundsChange = async (bbox) => {
    if (!bbox || bbox === mapBbox) return;
    setMapBbox(bbox);
    await fetchData(bbox);
  };

  if (loading) {
    return <div className="loading">Cargando publicaciones...</div>;
  }

  if (!isZonaSegura && !isZonaNoSegura) {
    return <div className="error">Zona no valida</div>;
  }

  const zoneName = isZonaSegura ? 'Zona Segura' : 'Zona No Segura';

  return (
    <div className="category-page">
      <nav className="breadcrumb">
        <Link to="/communities">Comunidades</Link>
        <span> / </span>
        <Link to={`/communities/${slug}`}>Espacios en {community?.name}</Link>
        <span> / </span>
        <span>{city?.name}</span>
        <span> / </span>
        <span>{zoneName}</span>
      </nav>

      <div className="category-header">
        <h1>
          {zoneName} {city?.name}
        </h1>
        <div className="category-actions">
          <select className="form-select" value={tipoEspacio} onChange={(e) => setTipoEspacio(e.target.value)}>
            <option value="">Todos los espacios</option>
            <option value="piso_independiente">Piso independiente</option>
            <option value="club_o_plaza">Club o plaza</option>
          </select>
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Recientes</option>
            <option value="best">Mejor valorados</option>
            <option value="worst">Peor valorados</option>
          </select>
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
          {user && (
            <Link to="/create-post" className="btn btn-primary">
              Crear publicación
            </Link>
          )}
        </div>
      </div>
      <p className="category-order-active">
        Ordenado por:{' '}
        {sort === 'best'
          ? 'Mejor valorados'
          : sort === 'worst'
            ? 'Peor valorados'
            : 'Recientes'}
      </p>

      {viewMode === 'map' ? (
        <PostsMapView
          posts={posts}
          onBoundsChange={handleMapBoundsChange}
          selectedProvincia={city?.name || community?.name || ''}
        />
      ) : (
        <div className="posts-list">
          {posts.length > 0 ? (
            posts.map((post) => <PostCard key={post._id} post={post} />)
          ) : (
            <div className="no-posts">
              <div className="no-posts-icon">{isZonaSegura ? 'OK' : 'ALERTA'}</div>
              <h3>
                {isZonaSegura
                  ? `No hay publicaciones aún en zona segura ${city?.name}`
                  : `No hay publicaciones reportadas en ${city?.name}`}
              </h3>
              <p>
                {isZonaSegura
                  ? 'Esta zona muestra espacios verificados y seguros. Sé la primera persona en publicar aquí.'
                  : 'Esta zona muestra espacios reportados por la comunidad. Por ahora no hay reportes.'}
              </p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-outline"
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button
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

export default Category;

