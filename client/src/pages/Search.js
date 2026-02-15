import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/Post/PostCard';
import PostsMapView from '../components/maps/PostsMapView';
import { PROVINCIAS } from '../constants/postFormOptions';
import { getSubzonaGeo } from '../constants/subzonasGeo';
import './Search.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSort = searchParams.get('sort') === 'top' ? 'best' : (searchParams.get('sort') || 'recent');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const subzona = searchParams.get('subzona') || '';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'list');
  const [sort, setSort] = useState(initialSort);
  const [mapBbox, setMapBbox] = useState('');
  const [page] = useState(Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const [filters, setFilters] = useState({
    provincia: searchParams.get('provincia') || searchParams.get('community') || '',
    tipoEspacio: searchParams.get('tipoEspacio') || ''
  });
  const subzonaGeo = useMemo(() => getSubzonaGeo(filters.provincia, subzona), [filters.provincia, subzona]);
  const subzonaBbox = useMemo(
    () => (subzonaGeo?.bbox ? subzonaGeo.bbox.join(',') : ''),
    [subzonaGeo]
  );

  const performSearch = async (extraParams = {}, overrides = {}) => {
    setLoading(true);

    try {
      const selectedSort = overrides.sort || sort;
      const params = {};
      const isRestoSubzona = subzona.toLowerCase() === 'resto';
      const mergedSearch = (!isRestoSubzona && subzona)
        ? [query, subzona].filter(Boolean).join(' ')
        : query;

      if (mergedSearch) params.search = mergedSearch;
      if (filters.provincia) params.community = filters.provincia;
      if (filters.tipoEspacio) params.tipoEspacio = filters.tipoEspacio;
      if (selectedSort) params.sort = selectedSort;
      if (page > 1) params.page = page;
      Object.assign(params, extraParams);
      if (viewMode === 'map' && !params.bbox) {
        if (mapBbox) params.bbox = mapBbox;
        else if (subzonaBbox) params.bbox = subzonaBbox;
      }
      if (viewMode === 'map' && !params.limit) params.limit = 200;

      const response = await axios.get('/api/posts', { params });
      setPosts(response.data.posts || []);

      const newParams = new URLSearchParams();
      if (query) newParams.set('q', query);
      newParams.set('view', viewMode);
      if (filters.provincia) newParams.set('provincia', filters.provincia);
      if (filters.tipoEspacio) newParams.set('tipoEspacio', filters.tipoEspacio);
      if (subzona) newParams.set('subzona', subzona);
      if (selectedSort) newParams.set('sort', selectedSort);
      if (page > 1) newParams.set('page', String(page));
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error buscando:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'map' && subzonaBbox) {
      setMapBbox(subzonaBbox);
      performSearch({ bbox: subzonaBbox, limit: 200 });
      return;
    }
    performSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e) => {
    e.preventDefault();
    if (viewMode === 'map') {
      const bbox = mapBbox || subzonaBbox;
      if (bbox) {
        await performSearch({ bbox, limit: 200 });
        return;
      }
      await performSearch({ limit: 200 });
      return;
    }
    await performSearch();
  };

  const handleMapBoundsChange = async (bbox) => {
    if (!bbox || bbox === mapBbox) return;
    setMapBbox(bbox);
    await performSearch({ bbox, limit: 200 });
  };

  return (
    <div className="search">
      <h1>Buscar publicaciones</h1>
      {subzona && (
        <div className="subzona-badge">
          Subzona: {subzona.toLowerCase() === 'resto' ? `Resto de ${filters.provincia || 'provincia'}` : subzona}
        </div>
      )}
      <p className="results-order-active">
        Ordenado por:{' '}
        {sort === 'best'
          ? 'Mejor valorados'
          : sort === 'worst'
            ? 'Peor valorados'
            : 'Recientes'}
      </p>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por título o contenido..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="search-filters">
          <select
            className="form-select"
            value={filters.provincia}
            onChange={(e) => setFilters({ ...filters, provincia: e.target.value })}
          >
            <option value="">Todas las provincias</option>
            {PROVINCIAS.map((provincia) => (
              <option key={provincia} value={provincia}>
                {provincia}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.tipoEspacio}
            onChange={(e) => setFilters({ ...filters, tipoEspacio: e.target.value })}
          >
            <option value="">Todos los tipos de espacio</option>
            <option value="piso_independiente">Piso independiente</option>
            <option value="club_o_plaza">Club o plaza</option>
          </select>
          <select
            className="form-select"
            value={sort}
            onChange={async (e) => {
              const nextSort = e.target.value;
              setSort(nextSort);
              if (viewMode === 'map') {
                const bbox = mapBbox || subzonaBbox;
                await performSearch(bbox ? { bbox, limit: 200 } : { limit: 200 }, { sort: nextSort });
                return;
              }
              await performSearch({}, { sort: nextSort });
            }}
          >
            <option value="recent">Recientes</option>
            <option value="best">Mejor valorados</option>
            <option value="worst">Peor valorados</option>
          </select>
        </div>

        <div className="view-toggle">
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
      </form>

      <div className="search-results">
        {viewMode === 'map' ? (
          <PostsMapView
            posts={posts}
            onBoundsChange={handleMapBoundsChange}
            initialBounds={subzonaGeo?.bbox || null}
            initialCenter={subzonaGeo?.center || null}
          />
        ) : posts.length > 0 ? (
          <>
            <p className="results-count">{posts.length} resultados encontrados</p>
            <div className="posts-list">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          </>
        ) : (
          !loading && (
            <p className="no-results">
              No se encontraron resultados. Intenta con otros términos de búsqueda.
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default Search;

