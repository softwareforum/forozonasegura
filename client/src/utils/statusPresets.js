export const STATUS_PRESETS = [
  { key: 'sonando_en_grande', label: 'Soñando en grande' },
  { key: 'bailando_con_la_luna', label: 'Bailando con la luna' },
  { key: 'en_modo_descanso', label: 'En modo descanso' },
  { key: 'de_ruta', label: 'De ruta' },
  { key: 'tomando_aire', label: 'Tomando aire' },
  { key: 'aprendiendo', label: 'Aprendiendo' },
  { key: 'creando', label: 'Creando' },
  { key: 'en_silencio', label: 'En silencio' },
  { key: 'mirando_el_horizonte', label: 'Mirando el horizonte' },
  { key: 'cuidandome', label: 'Cuidándome' },
  { key: 'trabajando_en_mi', label: 'Trabajando en mí' },
  { key: 'fluyendo', label: 'Fluyendo' }
];

export const STATUS_EMOJIS = [
  '✨',
  '🌙',
  '🌿',
  '🔥',
  '🌊',
  '🌸',
  '💫',
  '🧠',
  '📚',
  '🎧',
  '🧘‍♀️',
  '🚶‍♀️',
  '🧳',
  '🎨',
  '☕️',
  '🤍'
];

export const DEFAULT_STATUS_PRESET = 'en_silencio';
export const DEFAULT_STATUS_EMOJI = '✨';

export const labelFromKey = (key) => {
  const found = STATUS_PRESETS.find((item) => item.key === key);
  return found ? found.label : 'En silencio';
};
