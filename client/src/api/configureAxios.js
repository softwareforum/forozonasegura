import axios from 'axios';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const runtimeApiUrl = normalizeBaseUrl(process.env.REACT_APP_API_URL);
const isProduction = process.env.NODE_ENV === 'production';

if (runtimeApiUrl) {
  axios.defaults.baseURL = runtimeApiUrl;
} else if (!isProduction) {
  // En desarrollo dejamos URLs relativas para usar el proxy de CRA.
  axios.defaults.baseURL = '';
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[API CONFIG] REACT_APP_API_URL no está definido en producción. ' +
      'Las llamadas relativas /api pueden fallar fuera de local.'
  );
}
