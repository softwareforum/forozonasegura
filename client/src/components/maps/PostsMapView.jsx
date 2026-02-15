import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { PROVINCE_CENTERS, SPAIN_DEFAULT_CENTER } from '../../constants/provinceCenters';

const DEFAULT_CENTER = [SPAIN_DEFAULT_CENTER.lat, SPAIN_DEFAULT_CENTER.lng];

const readPostGeo = (post) => {
  const coordinates = post?.location?.geo?.center?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  const legacyLat = Number(post?.location?.geo?.lat);
  const legacyLng = Number(post?.location?.geo?.lng);
  if (Number.isFinite(legacyLat) && Number.isFinite(legacyLng)) {
    return { lat: legacyLat, lng: legacyLng };
  }
  return null;
};

const BoundsListener = ({ onBoundsChange }) => {
  const timeoutRef = useRef(null);
  const lastBboxRef = useRef('');
  const emitBounds = (map) => {
    if (!onBoundsChange) return;
    const sw = map.getBounds().getSouthWest();
    const ne = map.getBounds().getNorthEast();
    const bbox = [sw.lng, sw.lat, ne.lng, ne.lat].join(',');
    if (bbox === lastBboxRef.current) return;
    lastBboxRef.current = bbox;
    onBoundsChange(bbox);
  };

  const map = useMapEvents({
    moveend() {
      if (!onBoundsChange) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        emitBounds(map);
      }, 180);
    },
    zoomend() {
      if (!onBoundsChange) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        emitBounds(map);
      }, 180);
    }
  });

  useEffect(() => {
    if (!onBoundsChange) return;
    emitBounds(map);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [map, onBoundsChange]);

  return null;
};

const InitialViewport = ({ initialBounds, initialCenter, selectedProvincia, points }) => {
  const map = useMap();
  const lastAppliedRef = useRef('');

  const pointsKey = useMemo(
    () => points.map((item) => `${item.geo.lat.toFixed(5)},${item.geo.lng.toFixed(5)}`).join('|'),
    [points]
  );

  useEffect(() => {
    if (points.length > 0) {
      const markerBounds = L.latLngBounds(points.map((item) => [item.geo.lat, item.geo.lng]));
      if (markerBounds.isValid()) {
        const nextKey = `posts:${pointsKey}`;
        if (lastAppliedRef.current !== nextKey) {
          map.fitBounds(markerBounds, { padding: [28, 28] });
          lastAppliedRef.current = nextKey;
        }
        return;
      }
    }

    if (Array.isArray(initialBounds) && initialBounds.length === 4) {
      const nextKey = `bounds:${initialBounds.join(',')}`;
      if (lastAppliedRef.current === nextKey) return;
      map.fitBounds(
        [
          [initialBounds[1], initialBounds[0]],
          [initialBounds[3], initialBounds[2]]
        ],
        { padding: [20, 20] }
      );
      lastAppliedRef.current = nextKey;
      return;
    }

    if (selectedProvincia && PROVINCE_CENTERS[selectedProvincia]) {
      const provinceCenter = PROVINCE_CENTERS[selectedProvincia];
      const nextKey = `prov:${selectedProvincia}`;
      if (lastAppliedRef.current === nextKey) return;
      map.setView([provinceCenter.lat, provinceCenter.lng], provinceCenter.zoom || 10, { animate: false });
      lastAppliedRef.current = nextKey;
      return;
    }

    if (initialCenter?.lat && initialCenter?.lng) {
      const nextKey = `center:${initialCenter.lat},${initialCenter.lng},${initialCenter.zoom || 12}`;
      if (lastAppliedRef.current === nextKey) return;
      map.setView([initialCenter.lat, initialCenter.lng], initialCenter.zoom || 12, { animate: false });
      lastAppliedRef.current = nextKey;
      return;
    }

    const nextKey = 'spain-default';
    if (lastAppliedRef.current === nextKey) return;
    map.setView(DEFAULT_CENTER, SPAIN_DEFAULT_CENTER.zoom || 6, { animate: false });
    lastAppliedRef.current = nextKey;
  }, [initialBounds, initialCenter, map, points, pointsKey, selectedProvincia]);

  return null;
};

const PostsMapView = ({
  posts = [],
  onBoundsChange,
  height = 420,
  initialBounds = null,
  initialCenter = null,
  selectedProvincia = ''
}) => {
  const points = useMemo(
    () =>
      posts
        .map((post) => ({ post, geo: readPostGeo(post) }))
        .filter((item) => !!item.geo),
    [posts]
  );

  return (
    <div className="posts-map-view">
      <MapContainer center={DEFAULT_CENTER} zoom={SPAIN_DEFAULT_CENTER.zoom || 6} style={{ height, width: '100%', borderRadius: 8 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InitialViewport
          initialBounds={initialBounds}
          initialCenter={initialCenter}
          selectedProvincia={selectedProvincia}
          points={points}
        />
        <BoundsListener onBoundsChange={onBoundsChange} />
        {points.map(({ post, geo }) =>
          post?.location?.geo?.radiusMeters ? (
            <Circle
              key={`radius-${post._id}`}
              center={[geo.lat, geo.lng]}
              radius={post.location.geo.radiusMeters}
              pathOptions={{ color: '#7c3aed', weight: 1 }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>{post.title}</strong>
                  <div>
                    <Link to={`/post/${post._id}`}>Ver publicacion</Link>
                  </div>
                </div>
              </Popup>
            </Circle>
          ) : null
        )}
      </MapContainer>
    </div>
  );
};

export default PostsMapView;
