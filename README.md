# Foro Zona Segura

Plataforma web tipo foro enfocada en anuncios y comunidad sobre pisos para independientes, plazas a porcentaje y clubes/locales.

## Características Principales

- **Organización Jerárquica**: Comunidades Autónomas → Ciudades → Categorías (Pisos, Plazas, Clubes)
- **Sistema de Usuarios**: Registro, login, perfiles con reputación y niveles
- **Publicaciones**: Crear hilos, responder, sistema de votos
- **Moderación**: Panel completo para moderadores y administradores
- **Validación de Contenido**: No se permiten teléfonos ni nombres personales en publicaciones
- **Secciones Especiales**: Ayuda, Ayuda Profesional, Canal de Denuncias
- **Buscador**: Búsqueda avanzada por texto, comunidad, ciudad, categoría y tipo

## Stack Tecnológico

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticación
- Validación con express-validator
- Middleware de seguridad (Helmet, Rate Limiting)

### Frontend

- React 18
- React Router v6
- Axios para peticiones HTTP
- React Icons
- CSS moderno y responsive

## Instalación

### Prerrequisitos

- Node.js (v14 o superior)
- MongoDB (local o remoto)
- npm o yarn

### Pasos

1. **Clonar e instalar dependencias**

```bash
npm run install-all
```

2. **Configurar variables de entorno**

Crear archivo `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foro-vivienda
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
JWT_EXPIRE=7d
NODE_ENV=development
```

3. **Inicializar comunidades autónomas**

```bash
cd server
node scripts/initCommunities.js
```

4. **Iniciar servidor de desarrollo**

```bash
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:

- Backend en http://localhost:5000
- Frontend en http://localhost:3000

## Estructura del Proyecto

```
FOROTS/
├── server/
│   ├── models/          # Modelos de MongoDB
│   ├── routes/          # Rutas de la API
│   ├── middleware/      # Middleware (auth, validación)
│   ├── scripts/         # Scripts de utilidad
│   └── index.js         # Punto de entrada del servidor
├── client/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas principales
│   │   ├── context/     # Context API (Auth)
│   │   └── App.js       # Componente principal
│   └── public/
└── package.json         # Scripts principales
```

## Funcionalidades

### Usuarios

- Registro y login
- Perfiles con reputación y niveles
- Roles: Usuario, Moderador, Administrador
- Verificación para profesionales

### Publicaciones

- Crear publicaciones con categoría y tipo
- Responder a publicaciones
- Sistema de votos (upvote/downvote)
- Tipos: Alquiler, Traspaso, Oferta, Búsqueda
- Validación: Solo nombre de calle y ciudad (sin teléfonos ni nombres)

### Moderación

- Panel de moderación para moderadores
- Eliminar publicaciones/respuestas
- Banear/desbanear usuarios
- Bloquear/desbloquear publicaciones
- Fijar publicaciones
- Logs de todas las acciones

### Reportes

- Sistema de reportes en publicaciones
- Reportes anónimos opcionales
- Panel de reportes para moderadores

## API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Publicaciones

- `GET /api/posts` - Listar publicaciones (con filtros)
- `GET /api/posts/:id` - Obtener publicación
- `POST /api/posts` - Crear publicación
- `POST /api/posts/:id/replies` - Responder
- `POST /api/posts/:id/vote` - Votar
- `POST /api/posts/:id/report` - Reportar

### Comunidades

- `GET /api/communities` - Listar comunidades
- `GET /api/communities/:slug` - Obtener comunidad

### Recursos Profesionales

- `GET /api/professional-resources` - Listar recursos aprobados por categoria
- `POST /api/professional-resources/submissions` - Enviar recurso (estado `pending`)
- `GET /api/professional-resources/submissions` - Listar solicitudes (solo moderador/admin)
- `PATCH /api/professional-resources/submissions/:id` - Aprobar/Rechazar (solo moderador/admin)

### Moderación (requiere autenticación y rol)

- `GET /api/moderation/logs` - Logs de moderación
- `DELETE /api/moderation/posts/:id` - Eliminar publicación
- `POST /api/moderation/users/:id/ban` - Banear usuario

## Seguridad

- Validación de contenido (sin teléfonos ni nombres)
- Autenticación JWT
- Rate limiting
- Helmet para headers de seguridad
- Validación de entrada con express-validator
- Sanitización de datos

## Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Iniciar backend y frontend
npm run server       # Solo backend
npm run client       # Solo frontend
```

## Notas Importantes

- **Validación de Contenido**: El sistema bloquea automáticamente números de teléfono y emails en publicaciones
- **Privacidad**: Solo se permite mencionar nombre de calle y ciudad, no datos personales
- **Moderación**: Los moderadores tienen acceso completo al panel de moderación
- **Profesionales**: La sección de Ayuda Profesional requiere verificación

## Licencia

ISC

## Mapa de Zona (OpenStreetMap + Leaflet)

Se incorporo geolocalizacion aproximada para publicaciones:

- En `CreatePost` el usuario marca una zona en mapa (click) y se guarda un circulo de privacidad.
- El backend persiste un geofence en `location.geo.center` (GeoJSON Point) y `location.geo.radiusMeters`.
- El sistema mantiene compatibilidad con publicaciones antiguas que solo tengan `location.geo.lat/lng`.

### Contrato final de `location`

```json
{
  "location": {
    "provincia": "Madrid",
    "geo": {
      "center": { "type": "Point", "coordinates": [-3.7038, 40.4168] },
      "radiusMeters": 600
    }
  }
}
```

`municipioZona` y `calleAproximada` se mantienen solo como campos legacy opcionales para datos antiguos.

### Busqueda por mapa

`GET /api/posts` y `GET /api/posts/map` aceptan:

- `bbox=minLng,minLat,maxLng,maxLat`
- o `center=lng,lat&radius=1000`

Combinable con filtros existentes (`community`, `city`, `category`, `postType`, `zonaSegura`, etc.).

### Privacidad

- El campo canonico de ubicacion para nuevos posts es `location.geo` (centro aproximado + radio).
- `municipioZona` y `calleAproximada` no son obligatorios en el formulario actual.
- El nombre de area/zona se detecta automaticamente con OpenStreetMap (Nominatim) y no se edita manualmente.
- Se bloquean direcciones exactas (numero de portal/piso), telefonos y emails en validacion frontend/backend.

### Pasos rapidos para probar

1. Crear post seleccionando punto en el mapa.
2. Verificar preview de titulo: `Zona {area} en {provincia}` o fallback `Zona en {provincia}`.
3. Verificar en MongoDB que existe `location.geo.center`, `location.geo.radiusMeters` y, cuando aplique, `location.geo.label`/`location.geo.zoneKey`.
4. Crear dos posts en la misma zona y validar sufijo incremental `(2)`, `(3)`.
5. Abrir `PostDetail` y confirmar mapa del hilo y badge de area (si existe).
6. Ir a `Search`/`Category`, cambiar a modo `Mapa` y mover el mapa para cargar por `bbox`.

## Seguridad (Rate Limit + Sesion)

Variables de entorno recomendadas en `server/.env`:

```env
TRUST_PROXY=1
RATE_WINDOW_MS=900000
RATE_PUBLIC_MAX=300
RATE_AUTH_MAX=20
RATE_PASSWORD_MAX=10
RATE_ME_MAX=300
DEBUG_ENDPOINTS=true
```

Comportamiento de `429`:

- Respuesta uniforme con:
  - `success: false`
  - `code: "RATE_LIMIT"`
  - `message`
  - `retryAfterSeconds`
- Header HTTP `Retry-After` en segundos.
- En frontend, un `429` en `/api/auth/me` no limpia token ni hace logout; se muestra aviso y se reintenta con backoff.
- Endpoint de debug de seguridad solo en desarrollo y con `DEBUG_ENDPOINTS=true`: `GET /api/debug/security-status`.

## Reportes Profesionales (Formulario + Adjuntos + Telegram)

- Endpoint de reporte: `POST /api/posts/:id/report` (multipart/form-data)
- Campos:
  - `role` (obligatorio: `inquilino` o `facilita_espacio`)
  - `name` (opcional)
  - `email` (opcional, valido si se envia)
  - `phone` (opcional, valido si se envia)
  - `message` (obligatorio, minimo 20 caracteres)
  - `files[]` (opcional, max 6, max 10MB por archivo, max 15MB total)
- Tipos permitidos: `jpg/png/webp`, `mp4/mov`, `pdf`.
- Persistencia en coleccion `Report` con estado `open|archived`.
- Notificacion Telegram (si hay credenciales):
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
- Driver de almacenamiento (preparado para migrar a S3/Backblaze):
  - `STORAGE_DRIVER=local` (actual)

## Ayuda a Profesionales (Recursos y Apoyo)

- La seccion se enfoca en reduccion de dano, apoyo, derechos y seguridad.
- La plataforma no promueve el trabajo sexual; centraliza acceso a recursos para personas en vulnerabilidad.
- Incluye:
  - Aviso de seguridad y proposito de uso
  - Recursos por categorias (emergencia, salud, legal, social, etc.)
  - FAQ
  - Formulario para alta de recursos (quedan `pending` hasta revision)
  - Panel admin para aprobar/rechazar solicitudes

Variables recomendadas en `server/.env` para este modulo:

```env
RATE_RESOURCE_SUBMISSION_MAX=12
ADMIN_RESOURCE_EMAILS=
```

## Quality Score de publicaciones

Se separan tres sistemas:

- Votos (interactividad): ??/?? para feedback comunitario.
- Reportes (seguridad/veracidad): flujo de moderacion del anuncio, sin castigo directo por si solo a reputacion de terceros.
- Ranking de listados: usa `qualityScore` del post, no la reputacion del usuario.

Campos agregados en `Post`:

- `votesUp`, `votesDown`
- `reportsOpenCount`, `reportsApprovedCount`
- `qualityScore`
- `flags.hasOpenReports`, `flags.hasApprovedReports`

Formula:

```text
qualityScore = (votesUp - votesDown)
               - (3 * reportsOpenCount)
               - (15 * reportsApprovedCount)
               + bonus
bonus = +2 si (votesUp - votesDown) > 0 y no hay reportes abiertos ni aprobados
```

Ordenacion en `GET /api/posts`:

- `sort=recent` -> `createdAt desc`
- `sort=best` -> `qualityScore desc`, `createdAt desc`
- `sort=worst` -> `qualityScore asc`, `createdAt desc`

Compatibilidad con posts antiguos:

- Si faltan agregados, se usa fallback al calcular en consulta.
- Script de backfill:

```bash
cd server
npm run recalculate-quality-scores
```
