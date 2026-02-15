# Guía de Instalación de MongoDB

## 🔍 Situación Actual
MongoDB no está instalado en tu sistema. Necesitas MongoDB para que el proyecto funcione completamente.

---

## ✅ OPCIÓN 1: MongoDB Atlas (Recomendado - Más Fácil)

**MongoDB Atlas es gratuito y en la nube. No necesitas instalar nada.**

### Pasos:

1. **Crear cuenta en MongoDB Atlas**
   - Ve a: https://www.mongodb.com/cloud/atlas/register
   - Regístrate (es gratis)

2. **Crear un cluster gratuito**
   - Selecciona "Free" (M0)
   - Elige una región cercana (ej: `eu-west-1` para España)
   - Crea el cluster (tarda unos minutos)

3. **Obtener la cadena de conexión**
   - Click en "Connect" → "Connect your application"
   - Copia la URI (algo como: `mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/`)

4. **Configurar en tu proyecto**
   - Edita `server/.env`
   - Cambia `MONGODB_URI` por la URI de Atlas
   - Ejemplo:
     ```env
     MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/foro-vivienda?retryWrites=true&w=majority
     ```

5. **Configurar acceso**
   - En Atlas → Network Access → Add IP Address
   - Agrega `0.0.0.0/0` (permite desde cualquier IP) o tu IP específica

**✅ Ventajas:** Gratis, fácil, no necesitas instalar nada, funciona desde cualquier lugar

---

## ✅ OPCIÓN 2: Instalar MongoDB Localmente

### Windows:

1. **Descargar MongoDB Community Server**
   - Ve a: https://www.mongodb.com/try/download/community
   - Selecciona:
     - Version: 7.0 (o la más reciente)
     - Platform: Windows
     - Package: MSI
   - Descarga e instala

2. **Durante la instalación:**
   - Marca "Install MongoDB as a Service"
   - Marca "Install MongoDB Compass" (opcional, pero útil)

3. **Verificar instalación:**
   ```powershell
   # Verificar que el servicio existe
   Get-Service MongoDB
   
   # Iniciar servicio
   net start MongoDB
   ```

4. **Verificar que funciona:**
   ```powershell
   mongosh
   # Deberías ver el prompt de MongoDB
   ```

5. **Configurar en tu proyecto:**
   - Tu `.env` ya tiene la configuración correcta:
     ```env
     MONGODB_URI=mongodb://localhost:27017/foro-vivienda
     ```

**✅ Ventajas:** Control total, datos locales, gratis

---

## ✅ OPCIÓN 3: Usar Docker (Si tienes Docker instalado)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Luego usa: `mongodb://localhost:27017/foro-vivienda`

---

## 🚀 Después de Configurar MongoDB

1. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

2. **Inicializa las comunidades:**
   ```bash
   cd server
   npm run init-communities
   ```

3. **Verifica la conexión:**
   - Deberías ver: `✅ MongoDB conectado`
   - Y: `📊 Base de datos: foro-vivienda`

---

## ⚠️ Nota Importante

**Sin MongoDB, el proyecto puede funcionar parcialmente pero:**
- ❌ No podrás registrar usuarios
- ❌ No podrás crear posts
- ❌ No se guardarán datos
- ✅ El frontend funcionará
- ✅ Las rutas públicas funcionarán (pero sin datos)

**Recomendación:** Usa MongoDB Atlas (Opción 1) - es la más rápida y fácil.



