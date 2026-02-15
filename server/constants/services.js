const ALLOWED_SERVICES = [
  'cocinaDigna',
  'banoDigno',
  'fotosReales',
  'conviveConDueno',
  'sabanasYToallas',
  'calefaccion',
  'aguaCaliente',
  'aireOAventilador',
  'smartTv',
  'malosOlores',
  'wifi',
  'ascensor',
  'masDeUnPrimeroSinAscensor',
  'problemasVecinos',
  'trabaja24h',
  'aceptaLgtbi',
  'videoportero'
];

const LEGACY_SERVICE_KEY_MAP = {
  banoDigno: 'banoDigno',
  ['ba\u00f1oDigno']: 'banoDigno',
  ['ba\u00f1o_privado']: 'banoDigno',
  ['baÃ±oDigno']: 'banoDigno',
  ['baÃ±o_privado']: 'banoDigno',
  conviveConDueno: 'conviveConDueno',
  ['conviveConDue\u00f1o']: 'conviveConDueno',
  ['conviveConDueÃ±o']: 'conviveConDueno',
  cocina: 'cocinaDigna',
  bano_privado: 'banoDigno',
  aire_acondicionado: 'aireOAventilador',
  tv: 'smartTv'
};

const ALLOWED_SERVICES_SET = new Set(ALLOWED_SERVICES);

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

const normalizeRawKey = (rawKey) => {
  if (typeof rawKey !== 'string') return rawKey;
  return normalizeBrokenUtf8(removeDiacritics(rawKey.trim()));
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
};

const normalizeServiceKey = (key) => {
  if (typeof key !== 'string') return key;
  const cleanedKey = normalizeRawKey(key);
  return LEGACY_SERVICE_KEY_MAP[cleanedKey] || LEGACY_SERVICE_KEY_MAP[key] || cleanedKey;
};

const emptyServiciosObject = () =>
  ALLOWED_SERVICES.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

const normalizeServiciosInput = (input) => {
  const normalized = emptyServiciosObject();
  const errors = [];

  if (input === undefined || input === null) {
    return { servicios: normalized, errors };
  }

  if (Array.isArray(input)) {
    input.forEach((rawKey, idx) => {
      const key = normalizeServiceKey(rawKey);
      if (!ALLOWED_SERVICES_SET.has(key)) {
        errors.push(`servicios[${idx}] invalido: "${rawKey}"`);
        return;
      }
      normalized[key] = true;
    });
    return { servicios: normalized, errors };
  }

  if (typeof input !== 'object') {
    errors.push('servicios debe ser un objeto o un array');
    return { servicios: normalized, errors };
  }

  Object.entries(input).forEach(([rawKey, rawValue]) => {
    const key = normalizeServiceKey(rawKey);
    if (!ALLOWED_SERVICES_SET.has(key)) {
      errors.push(`servicios.${rawKey} no esta permitido`);
      return;
    }
    const boolValue = toBoolean(rawValue);
    if (boolValue === null) {
      errors.push(`servicios.${rawKey} debe ser boolean`);
      return;
    }
    normalized[key] = boolValue;
  });

  return { servicios: normalized, errors };
};

const serviciosObjectToArray = (servicios = {}) =>
  ALLOWED_SERVICES.filter((key) => servicios[key] === true);

module.exports = {
  ALLOWED_SERVICES,
  ALLOWED_SERVICES_SET,
  LEGACY_SERVICE_KEY_MAP,
  normalizeServiceKey,
  normalizeServiciosInput,
  serviciosObjectToArray
};
