import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { PROVINCE_CENTERS, SPAIN_DEFAULT_CENTER } from '../../constants/provinceCenters';

const DEFAULT_CENTER = [SPAIN_DEFAULT_CENTER.lat, SPAIN_DEFAULT_CENTER.lng];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const ClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

const CenterUpdater = ({ selectedProvincia }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedProvincia) return;

    const provinceCenter = PROVINCE_CENTERS[selectedProvincia] || SPAIN_DEFAULT_CENTER;
    map.setView([provinceCenter.lat, provinceCenter.lng], provinceCenter.zoom, { animate: true });
  }, [map, selectedProvincia]);

  return null;
};

const MapPicker = ({
  value,
  onChange,
  selectedProvincia,
  radiusMeters = 600,
  height = 320
}) => {
  const currentCenter = value?.center || null;
  const provinceCenter = selectedProvincia ? (PROVINCE_CENTERS[selectedProvincia] || SPAIN_DEFAULT_CENTER) : null;
  const mapCenter = currentCenter
    ? [currentCenter.lat, currentCenter.lng]
    : provinceCenter
      ? [provinceCenter.lat, provinceCenter.lng]
      : DEFAULT_CENTER;
  const initialZoom = provinceCenter?.zoom || SPAIN_DEFAULT_CENTER.zoom;
  const lastProvinceRef = useRef(selectedProvincia || '');

  useEffect(() => {
    if (!selectedProvincia || selectedProvincia === lastProvinceRef.current) return;
    lastProvinceRef.current = selectedProvincia;
    if (value?.center) {
      onChange({ center: null, radiusMeters });
    }
  }, [onChange, radiusMeters, selectedProvincia, value?.center]);

  const circleCenter = useMemo(() => {
    if (!currentCenter) return null;
    return [currentCenter.lat, currentCenter.lng];
  }, [currentCenter]);

  return (
    <div className="map-picker">
      <MapContainer center={mapCenter} zoom={initialZoom} style={{ height, width: '100%', borderRadius: 8 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterUpdater selectedProvincia={selectedProvincia} />
        <ClickHandler onPick={(center) => onChange({ center, radiusMeters })} />
        {circleCenter && (
          <>
            <Marker position={circleCenter} />
            <Circle center={circleCenter} radius={radiusMeters} pathOptions={{ color: '#7c3aed' }} />
          </>
        )}
      </MapContainer>
      <small className="form-hint">
        Arrastra el mapa o haz clic para marcar la zona. Radio de la zona: {radiusMeters} m.
      </small>
    </div>
  );
};

export default MapPicker;

