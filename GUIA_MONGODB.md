# Guía Rápida: Configurar MongoDB

## Opción 1: MongoDB Atlas (Recomendado - Gratis y Fácil)

### Pasos:

1. **Crear cuenta en MongoDB Atlas**
   - Ve a: https://www.mongodb.com/cloud/atlas/register
   - Regístrate con tu email (es gratis)

2. **Crear un Cluster**
   - Selecciona "Build a Database" → "FREE" (M0)
   - Elige una región cercana (ej: AWS / eu-west-1 para Europa)
   - Crea el cluster (tarda 3-5 minutos)

3. **Configurar acceso**
   - En "Database Access", crea un usuario:
     - Username: `foro-admin`
     - Password: (genera una segura, guárdala)
   - En "Network Access", añade IP: `0.0.0.0/0` (permite acceso desde cualquier lugar)

4. **Obtener cadena de conexión**
   - En "Database" → "Connect" → "Connect your application"
   - Copia la cadena que se ve así:
     ```
     mongodb+srv://foro-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Reemplaza `<password>` con la contraseña que creaste

5. **Actualizar .env**
   - Crea `server/.env` con:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://foro-admin:TU_PASSWORD@cluster0.xxxxx.mongodb.net/foro-vivienda?retryWrites=true&w=majority
   JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

## Opción 2: MongoDB Local (Windows)

### Instalación:

1. **Descargar MongoDB**
   - Ve a: https://www.mongodb.com/try/download/community
   - Selecciona: Windows, MSI, versión más reciente
   - Descarga e instala

2. **Durante la instalación:**
   - Marca "Install MongoDB as a Service"
   - Deja la configuración por defecto

3. **Verificar instalación**
   - MongoDB se inicia automáticamente
   - Verifica en: Servicios de Windows → MongoDB

4. **Configurar .env**
   - Crea `server/.env` con:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/foro-vivienda
   JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

## Después de configurar MongoDB:

1. **Instalar dependencias del servidor:**
   ```bash
   cd server
   npm install
   ```

2. **Inicializar comunidades:**
   ```bash
   npm run init-communities
   ```

3. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

¡Listo! Tu aplicación debería funcionar.

