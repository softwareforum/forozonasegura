# Instrucciones para Iniciar la Aplicación

## Pasos para ejecutar la aplicación

### 1. Instalar dependencias del backend
```bash
cd server
npm install
```

### 2. Instalar dependencias del frontend (si no se hizo)
```bash
cd client
npm install
```

### 3. Configurar variables de entorno

Crear archivo `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foro-vivienda
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui_cambiar_en_produccion
JWT_EXPIRE=7d
NODE_ENV=development
```

### 4. Inicializar comunidades autónomas
```bash
cd server
npm run init-communities
```

### 5. Iniciar el servidor backend
```bash
cd server
npm run dev
```

El backend estará disponible en: http://localhost:5000

### 6. Iniciar el frontend (en otra terminal)
```bash
cd client
npm start
```

El frontend estará disponible en: http://localhost:3000

## Solución de problemas

### Si solo ves carpetas en el navegador:
1. Verifica que el servidor backend esté corriendo
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que MongoDB esté corriendo
4. Asegúrate de que todas las dependencias estén instaladas

### Errores comunes:
- **"Cannot find module"**: Ejecuta `npm install` en el directorio correspondiente
- **"Network Error"**: Verifica que el backend esté corriendo en el puerto 5000
- **"MongoDB connection error"**: Asegúrate de que MongoDB esté instalado y corriendo

## Verificación rápida

1. Backend corriendo: http://localhost:5000/api/health
2. Frontend corriendo: http://localhost:3000
3. MongoDB corriendo: Verifica con `mongosh` o tu cliente MongoDB

