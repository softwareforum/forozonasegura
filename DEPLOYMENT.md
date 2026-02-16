# Deployment readiness (client + server)

Proyecto:
- `client/` -> React (CRA) en GitHub Pages
- `server/` -> Express + MongoDB (host separado)

## 1) Checklist local (pre-staging)

1. Instalar dependencias limpias:
   - `cd server && npm ci`
   - `cd ../client && npm ci`
2. Variables de entorno:
   - Copiar `server/.env.example` -> `server/.env`
   - Copiar `client/.env.example` -> `client/.env`
3. Validar API frontend:
   - `REACT_APP_API_URL` vacio o `http://localhost:5000`
   - En local el proxy de CRA sigue funcionando.
4. Ejecutar pruebas:
   - `cd server && npm test`
   - `cd ../client && npm run build`
5. Limpieza de demo data (si aplica):
   - `cd server && npm run cleanup-demo-data`
   - Opcional: `npm run anonymize-data`

## 2) Checklist staging

1. Backend en entorno staging (Render/Railway/Fly/VPS):
   - `NODE_ENV=production`
   - `MONGODB_URI=<staging-uri>`
   - `JWT_SECRET=<secret-largo>`
   - `CLIENT_URL=<url-staging-frontend>`
   - `CORS_ORIGINS=<url-staging-frontend>,http://localhost:3000`
   - `TRUST_PROXY=1` si hay proxy/CDN
2. Frontend build de staging:
   - `REACT_APP_API_URL=<url-backend-staging>`
3. Validar endpoints base:
   - `GET /api/health` responde `200`.
4. Smoke test:
   - login/register
   - fetch de posts
   - flows protegidos con auth
5. Revisar CORS:
   - origen exacto del frontend staging
   - no usar `*` con credentials.

## 3) Checklist produccion

1. Rotar secretos antes de publicar:
   - Mongo URI/password
   - JWT secret
   - SMTP/password
   - reCAPTCHA secret
   - Telegram bot token
2. Configurar frontend GitHub Pages:
   - `REACT_APP_API_URL=<url-backend-produccion>`
   - `REACT_APP_RECAPTCHA_SITE_KEY=<site-key-produccion>`
   - `npm run deploy` en `client/`
3. Configurar backend:
   - `CLIENT_URL=https://<usuario>.github.io/<repo>`
   - `CORS_ORIGINS=https://<usuario>.github.io/<repo>`
   - `TRUST_PROXY=1` (si aplica)
   - logs estructurados sin payload sensible
4. Verificar seguridad:
   - workflow `secret-scan.yml` activo
   - `npm audit` revisado y plan de upgrade
5. Validar operacion:
   - `GET /api/health`
   - rutas publicas y protegidas
   - rate-limit esperado

## 4) Estrategia axios /api por entorno

Estado aplicado:
- Existe `client/src/api/configureAxios.js`.
- En produccion usa `REACT_APP_API_URL` como `axios.defaults.baseURL`.
- En desarrollo mantiene base URL relativa para no romper proxy de CRA.

Resultado:
- GitHub Pages no intenta usar `https://<pages>/api/...` si `REACT_APP_API_URL` esta definido.

## 5) Riesgos detectados y fix aplicado (esta iteracion)

1. Riesgo: faltaba checklist formal local/staging/prod.
   - Fix aplicado: este documento con pasos operativos.
2. Riesgo: no existia checklist de seguridad consolidado.
   - Fix aplicado: nuevo `SECURITY_CHECKLIST.md`.
3. Riesgo potencial: secretos historicos en `.env` local.
   - Fix aplicado previamente: `.gitignore` reforzado + `.env.example` + auditoria.
   - Accion pendiente manual: rotacion y limpieza de historial git si se filtraron.

## 6) Si hubo secretos en git: como limpiar

1. Rotar credenciales primero (siempre).
2. Eliminar de historial (ejemplo con `git filter-repo` o BFG) y forzar push.
3. Invalidar tokens antiguos en proveedores externos.
4. Verificar con gitleaks/trufflehog tras limpieza.
