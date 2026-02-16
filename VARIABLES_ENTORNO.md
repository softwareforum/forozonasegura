# Variables de entorno

## Server (`server/.env`)
Copia `server/.env.example` a `server/.env` y completa valores reales.

Variables clave:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `RECAPTCHA_SECRET`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `TRUST_PROXY` (`1` detrás de proxy/CDN)
- límites de rate limit (`RATE_*`)

## Client (`client/.env`)
Copia `client/.env.example` a `client/.env`.

Variables clave:

- `REACT_APP_API_URL`:
  - local: vacío o `http://localhost:5000` (si usas proxy de CRA, puede quedar vacío)
  - producción (GitHub Pages): URL pública del backend (sin `/api`)
- `REACT_APP_RECAPTCHA_SITE_KEY`

## Scripts de limpieza antes de producción

Desde `server/`:

```bash
npm run cleanup-demo-data
```

- Elimina usuarios/posts demo por patrones seguros.
- Requiere confirmación manual escribiendo `DELETE_DEMO`.
- No elimina cuentas con rol `administrador` o `moderador`.

Opcional (anonimización de datos sensibles):

```bash
npm run anonymize-data
```

- Enmascara datos de contacto en reportes/recursos.
- Requiere confirmación manual escribiendo `ANONYMIZE_DATA`.

## Recomendaciones de seguridad

- Nunca subas `.env` al repositorio.
- Rota todas las claves si se expusieron en algún momento.
- Usa valores distintos para local, staging y producción.
