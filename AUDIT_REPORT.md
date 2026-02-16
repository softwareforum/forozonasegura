# Informe de auditoría de seguridad y despliegue

Fecha: 2026-02-16  
Ámbito: `client/` (CRA + GitHub Pages) y `server/` (Node/Express + MongoDB)

## Resumen ejecutivo

Se detectaron riesgos críticos por exposición de secretos en archivos locales `.env`, riesgos altos por configuración frontend de API en GitHub Pages (llamadas relativas `/api`) y vulnerabilidades en dependencias con `npm audit`.

Se aplicaron cambios incrementales de hardening sin tocar lógica de negocio:

- Configuración de API por entorno en frontend (`REACT_APP_API_URL`).
- Scripts seguros para limpieza de datos demo y anonimización.
- `env examples` para cliente y servidor.
- Workflow de CI para secret scanning + auditoría de dependencias.
- Documentación de despliegue y checklist de seguridad.

## Hallazgos y acciones

### 1) Secretos sensibles en archivos de entorno locales

- Severidad: **Alta**
- Evidencia:
  - `server/.env` contiene `MONGODB_URI`, `EMAIL_PASS`, `RECAPTCHA_SECRET`, etc.
  - `client/.env` contiene `REACT_APP_RECAPTCHA_SITE_KEY`.
  - Comprobado con `rg` en archivos locales.
- Impacto:
  - Compromiso potencial de BD, correo, reCAPTCHA y canales de notificación.
- Fix aplicado:
  - Se añadieron/normalizaron plantillas:
    - `server/.env.example`
    - `client/.env.example`
  - Se reforzó `.gitignore` para excluir `.env*` globalmente.
- Acción operativa requerida:
  - Rotar inmediatamente credenciales históricas (Mongo, SMTP, reCAPTCHA secret, JWT, Telegram).

### 2) Frontend en GitHub Pages llamando a `/api` relativo

- Severidad: **Alta**
- Evidencia:
  - Múltiples llamadas `axios.get('/api/...')` en `client/src/**`.
  - Sin `baseURL` global previo para producción.
- Impacto:
  - En Pages puede intentar `https://<github-pages>/api/...` y fallar.
- Fix aplicado:
  - Nuevo archivo `client/src/api/configureAxios.js`.
  - Import global en `client/src/index.js`.
  - En producción usa `REACT_APP_API_URL`; en local mantiene compatibilidad con proxy de CRA.

### 3) Clave reCAPTCHA hardcodeada en HTML público

- Severidad: **Media**
- Evidencia:
  - `client/public/index.html:9` tenía `render=<site-key>` hardcodeado.
- Impacto:
  - Acoplamiento a una clave concreta y huella del entorno previo.
- Fix aplicado:
  - Reemplazo por `%REACT_APP_RECAPTCHA_SITE_KEY%` en `client/public/index.html`.

### 4) Dependencias con vulnerabilidades reportadas

- Severidad: **Media**
- Evidencia:
  - `server`: `lodash` (moderate) por `npm audit`.
  - `client`: `axios`, `react-router-dom/@remix-run/router` (high) por `npm audit`.
- Impacto:
  - Riesgos de seguridad conocidos en runtime.
- Fix propuesto:
  - Ejecutar `npm audit fix` y validar regresión.
  - En caso de cambios mayores, fijar versiones y probar rutas críticas.

### 5) Logs de depuración / consola en producción

- Severidad: **Media**
- Evidencia:
  - `rg "console.log|console.error|console.warn"` devuelve trazas en `server/routes/posts.js`, páginas React y scripts.
- Impacto:
  - Posible fuga de contexto sensible y ruido operativo.
- Fix propuesto:
  - Unificar logs en `server/utils/logger.js`.
  - Proteger logs de debug con `NODE_ENV !== 'production'`.
  - Evitar imprimir payloads sensibles.

### 6) Artefactos no deseados en repositorio (build/uploads)

- Severidad: **Media**
- Evidencia:
  - Existe `client/build/` y `server/uploads/` en workspace.
- Impacto:
  - Riesgo de subir artefactos, tamaño de repo y potencial fuga de adjuntos.
- Fix aplicado:
  - `.gitignore` reforzado para `**/build`, `**/uploads`, `**/logs`.
- Acción operativa recomendada:
  - Si ya estuvieron trackeados, ejecutar `git rm -r --cached client/build server/uploads`.

### 7) Falta de automatización de escaneo de secretos/dependencias en CI

- Severidad: **Baja**
- Evidencia:
  - No existía `.github/workflows` para escaneo.
- Impacto:
  - Riesgo de regresión sin controles automáticos.
- Fix aplicado:
  - Nuevo workflow `.github/workflows/secret-scan.yml` con:
    - gitleaks
    - `npm audit` (client/server, no bloqueante)

## Cambios aplicados (justificados)

- `.gitignore`: exclusión estricta de `.env*`, uploads, build, logs.
- `client/.env.example`: placeholders públicos.
- `server/.env.example`: placeholders completos y variables de seguridad/infra.
- `client/src/api/configureAxios.js`: `baseURL` por entorno.
- `client/src/index.js`: carga global de configuración axios.
- `client/public/index.html`: reCAPTCHA site key vía variable de entorno.
- `server/scripts/cleanup-demo-data.js`: limpieza segura de datos demo (confirmación manual).
- `server/scripts/anonymize.js`: anonimización opcional de campos sensibles.
- `server/package.json`: scripts `cleanup-demo-data` y `anonymize-data`.
- `.github/workflows/secret-scan.yml`: escaneo automático.
- `VARIABLES_ENTORNO.md` y `DEPLOYMENT.md`: documentación operativa.

## Verificaciones ejecutadas

- `npm audit --omit=dev` en `server/` (1 moderada).
- `npm audit --omit=dev` en `client/` (4 altas).

## Recomendaciones inmediatas (prioridad)

1. Rotar todas las claves expuestas históricamente.
2. Configurar `REACT_APP_API_URL` en build de Pages antes de publicar.
3. Limpiar demo data/anonimizar:
   - `npm run cleanup-demo-data`
   - `npm run anonymize-data` (opcional)
4. Actualizar dependencias vulnerables y volver a auditar.
