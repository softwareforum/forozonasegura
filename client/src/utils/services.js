import { LEGACY_SERVICIO_KEY_MAP, SERVICIOS_OPTIONS } from '../constants/postFormOptions';

const ALLOWED_SERVICES = new Set(SERVICIOS_OPTIONS.map((s) => s.key));

const removeDiacritics = (value) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeBrokenUtf8 = (value) =>
  value
    .replace(/Ã±/g, 'n')
    .replace(/Ã¡/g, 'a')
    .replace(/Ã©/g, 'e')
    .replace(/Ã­/g, 'i')
    .replace(/Ã³/g, 'o')
    .replace(/Ãº/g, 'u');

export const normalizeServiceKey = (key) => {
  if (typeof key !== 'string') return key;
  const normalizedRaw = normalizeBrokenUtf8(removeDiacritics(key.trim()));
  return LEGACY_SERVICIO_KEY_MAP[normalizedRaw] || LEGACY_SERVICIO_KEY_MAP[key] || normalizedRaw;
};

export const normalizeServiciosObject = (servicios = {}) => {
  const normalized = {};

  SERVICIOS_OPTIONS.forEach(({ key }) => {
    normalized[key] = false;
  });

  Object.entries(servicios || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeServiceKey(rawKey);
    if (!ALLOWED_SERVICES.has(key)) return;
    normalized[key] = rawValue === true;
  });

  return normalized;
};

export const getActiveServiceKeys = (servicios = {}) => {
  const normalized = normalizeServiciosObject(servicios);
  return Object.keys(normalized).filter((key) => normalized[key] === true);
};
