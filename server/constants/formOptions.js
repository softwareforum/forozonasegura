const CHECK_IN_OUT_CANONICAL = [
  'Llegada despues de las 15:00 y salida antes de las 12:00',
  'Llegada y salida flexible'
];

const CLEANING_FREQUENCY_CANONICAL = [
  'Nunca',
  '1 vez al mes',
  '1 vez por semana',
  '2 o mas veces por semana',
  'Limpieza diaria'
];

const CHECK_IN_OUT_ALIASES = {
  'Llegada después de las 15:00 y salida antes de las 12:00':
    'Llegada despues de las 15:00 y salida antes de las 12:00',
  'Llegada despuÃ©s de las 15:00 y salida antes de las 12:00':
    'Llegada despues de las 15:00 y salida antes de las 12:00'
};

const CLEANING_FREQUENCY_ALIASES = {
  '2 o más veces por semana': '2 o mas veces por semana',
  '2 o mÃ¡s veces por semana': '2 o mas veces por semana'
};

const normalizeCheckInOut = (value) => {
  if (typeof value !== 'string') return value;
  return CHECK_IN_OUT_ALIASES[value] || value;
};

const normalizeCleaningFrequency = (value) => {
  if (typeof value !== 'string') return value;
  return CLEANING_FREQUENCY_ALIASES[value] || value;
};

const isValidCheckInOut = (value) =>
  CHECK_IN_OUT_CANONICAL.includes(normalizeCheckInOut(value));

const isValidCleaningFrequency = (value) =>
  CLEANING_FREQUENCY_CANONICAL.includes(normalizeCleaningFrequency(value));

module.exports = {
  CHECK_IN_OUT_CANONICAL,
  CLEANING_FREQUENCY_CANONICAL,
  normalizeCheckInOut,
  normalizeCleaningFrequency,
  isValidCheckInOut,
  isValidCleaningFrequency
};
