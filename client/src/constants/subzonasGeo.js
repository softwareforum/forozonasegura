const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const SUBZONAS_GEO = {
  Asturias: {
    Gijon: {
      center: { lat: 43.5322, lng: -5.6611, zoom: 12 },
      bbox: [-5.75, 43.47, -5.55, 43.60]
    },
    Oviedo: {
      center: { lat: 43.3614, lng: -5.8494, zoom: 12 },
      bbox: [-5.94, 43.30, -5.74, 43.42]
    },
    Aviles: {
      center: { lat: 43.5558, lng: -5.9248, zoom: 12 },
      bbox: [-6.01, 43.50, -5.84, 43.61]
    }
  },
  Navarra: {
    Pamplona: {
      center: { lat: 42.8125, lng: -1.6458, zoom: 12 },
      bbox: [-1.72, 42.76, -1.56, 42.87]
    }
  },
  'La Rioja': {
    Logrono: {
      center: { lat: 42.4627, lng: -2.4449, zoom: 12 },
      bbox: [-2.54, 42.40, -2.35, 42.52]
    }
  },
  Madrid: {
    'Madrid capital': {
      center: { lat: 40.4168, lng: -3.7038, zoom: 11 },
      bbox: [-3.89, 40.31, -3.54, 40.56]
    }
  },
  Cantabria: {
    Santander: {
      center: { lat: 43.4623, lng: -3.8099, zoom: 12 },
      bbox: [-3.91, 43.41, -3.75, 43.51]
    }
  },
  'Region de Murcia': {
    Murcia: {
      center: { lat: 37.9834, lng: -1.1299, zoom: 12 },
      bbox: [-1.24, 37.90, -1.00, 38.08]
    }
  },
  'Islas Baleares': {
    Palma: {
      center: { lat: 39.5696, lng: 2.6502, zoom: 12 },
      bbox: [2.55, 39.50, 2.79, 39.66]
    }
  }
};

const PROVINCIA_ALIASES = {
  'comunidad de madrid': 'Madrid',
  madrid: 'Madrid',
  baleares: 'Islas Baleares',
  'islas baleares': 'Islas Baleares',
  murcia: 'Region de Murcia',
  'region de murcia': 'Region de Murcia'
};

export const getSubzonaGeo = (provincia, subzona) => {
  const provinciaNorm = normalizeText(provincia);
  const subzonaNorm = normalizeText(subzona);
  if (!provinciaNorm || !subzonaNorm || subzonaNorm === 'resto') return null;

  const provinciaKey =
    PROVINCIA_ALIASES[provinciaNorm] ||
    Object.keys(SUBZONAS_GEO).find((key) => normalizeText(key) === provinciaNorm);
  if (!provinciaKey) return null;

  const subzonas = SUBZONAS_GEO[provinciaKey] || {};
  const subzonaKey = Object.keys(subzonas).find((key) => normalizeText(key) === subzonaNorm);
  return subzonaKey ? subzonas[subzonaKey] : null;
};

