# Security checklist (deployment)

## 1) Secretos y .env

Checklist:
- [ ] Nunca commitear `.env`, `.env.*` (solo `*.env.example`).
- [ ] Revisar que no haya tokens hardcodeados en `client/public` o `server/**`.
- [ ] Mantener secretos solo en variables de entorno del proveedor.
- [ ] Rotar claves si alguna vez estuvieron en git o compartidas.

Variables sensibles tipicas:
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_PASS`
- `RECAPTCHA_SECRET`
- `TELEGRAM_BOT_TOKEN`

Rotacion recomendada:
1. Crear nuevas credenciales.
2. Actualizar staging/prod.
3. Invalidar claves antiguas.
4. Verificar logs de acceso anomalo.

## 2) Que NO commitear

- `.env`, `.env.*`
- `node_modules/`
- `build/`
- `uploads/`
- `logs/`, `*.log`
- export de BD, dumps o seeds con datos reales
- adjuntos de reportes/evidencia

Nota:
- El repo ya tiene reglas de ignore para estos casos; mantenerlas en root y por carpeta.

## 3) CORS, proxy y headers

Checklist:
- [ ] `CLIENT_URL` apunta al dominio exacto del frontend.
- [ ] `TRUST_PROXY=1` cuando hay reverse proxy/CDN.
- [ ] `helmet()` activo en Express.
- [ ] No usar `origin: *` con `credentials: true`.
- [ ] Exponer solo rutas necesarias (debug solo en no-produccion).

Estado actual observado:
- CORS configurado con `CLIENT_URL`.
- `trust proxy` configurable por env.
- `helmet` habilitado.
- `/api/health` existente.

## 4) Logs y PII

Checklist:
- [ ] Evitar tokens, passwords, emails completos en logs.
- [ ] Enmascarar IP/email cuando no sea imprescindible.
- [ ] No imprimir payloads completos de auth/reportes en produccion.
- [ ] Usar niveles (`info/warn/error`) y contexto minimo.

## 5) Dependencias y CI

Checklist:
- [ ] Ejecutar `npm audit` en `client` y `server` antes de release.
- [ ] Tener escaneo de secretos en CI (`gitleaks` o equivalente).
- [ ] Revisar advisories altos y criticos antes de publicar.

Estado actual observado:
- workflow de secret scan presente en `.github/workflows/secret-scan.yml`.

## 6) Riesgos detectados y fix aplicado (esta iteracion)

1. Riesgo: no existia checklist dedicado de seguridad.
   - Fix aplicado: este documento.
2. Riesgo: posibles secretos historicos en repositorio.
   - Fix aplicado previo: `.env.example`, `.gitignore` reforzado, auditoria.
   - Pendiente manual: rotacion + saneado de historial git si hubo leak.
3. Riesgo: frontend en Pages podia romper si API URL no estaba definida.
   - Fix aplicado previo: `client/src/api/configureAxios.js` con `REACT_APP_API_URL`.
