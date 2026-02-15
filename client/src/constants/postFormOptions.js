export const PROVINCIAS = [
  'Alava', 'Albacete', 'Alicante', 'Almeria', 'Asturias', 'Avila', 'Badajoz',
  'Barcelona', 'Burgos', 'Caceres', 'Cadiz', 'Cantabria', 'Castellon', 'Ciudad Real',
  'Cordoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipuzcoa', 'Huelva',
  'Huesca', 'Jaen', 'La Coruna', 'La Rioja', 'Las Palmas', 'Leon', 'Lleida',
  'Lugo', 'Madrid', 'Malaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla',
  'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya',
  'Zamora', 'Zaragoza'
];

export const SERVICIOS_OPTIONS = [
  { key: 'cocinaDigna', label: 'Cocina digna' },
  { key: 'banoDigno', label: 'Baño digno' },
  { key: 'fotosReales', label: 'Fotos reales del espacio' },
  { key: 'conviveConDueno', label: 'Convive con dueño' },
  { key: 'sabanasYToallas', label: 'Sábanas y toallas' },
  { key: 'calefaccion', label: 'Calefacción' },
  { key: 'aguaCaliente', label: 'Agua caliente' },
  { key: 'aireOAventilador', label: 'Aire acondicionado o ventilador' },
  { key: 'smartTv', label: 'Smart TV' },
  { key: 'malosOlores', label: 'Malos olores' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'ascensor', label: 'Ascensor' },
  { key: 'masDeUnPrimeroSinAscensor', label: 'Más de un primer piso sin ascensor' },
  { key: 'problemasVecinos', label: 'Problemas con vecinos' },
  { key: 'trabaja24h', label: 'Trabaja 24h' },
  { key: 'aceptaLgtbi', label: 'Acepta LGTBI+' },
  { key: 'videoportero', label: 'Videoportero' }
];

export const LEGACY_SERVICIO_KEY_MAP = {
  ['ba\u00f1oDigno']: 'banoDigno',
  ['conviveConDue\u00f1o']: 'conviveConDueno',
  'baÃ±oDigno': 'banoDigno',
  'conviveConDueÃ±o': 'conviveConDueno',
  bano_privado: 'banoDigno',
  ['ba\u00f1o_privado']: 'banoDigno',
  cocina: 'cocinaDigna',
  aire_acondicionado: 'aireOAventilador',
  tv: 'smartTv'
};

export const ANFITRION_VICIOS_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'a_veces', label: 'A veces' },
  { value: 'frecuentes', label: 'Frecuentes' }
];

export const ANFITRION_ACOSO_OPTIONS = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'a_veces', label: 'A veces' },
  { value: 'frecuente', label: 'Frecuente' }
];

export const ANFITRION_CARACTER_OPTIONS = [
  { value: 'respetuoso', label: 'Respetuoso' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'conflictivo', label: 'Conflictivo' }
];

export const CHECK_IN_OUT_OPTIONS = [
  {
    value: 'Llegada despues de las 15:00 y salida antes de las 12:00',
    label: 'Llegada después de las 15:00 y salida antes de las 12:00'
  },
  { value: 'Llegada y salida flexible', label: 'Llegada y salida flexible' }
];

export const CLEANING_FREQUENCY_OPTIONS = [
  { value: 'Nunca', label: 'Nunca' },
  { value: '1 vez al mes', label: '1 vez al mes' },
  { value: '1 vez por semana', label: '1 vez por semana' },
  { value: '2 o mas veces por semana', label: '2 o más veces por semana' },
  { value: 'Limpieza diaria', label: 'Limpieza diaria' }
];



