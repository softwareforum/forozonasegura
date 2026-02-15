# Variables de Entorno - Foro Zona Segura

## 📋 Instrucciones

1. Copia este contenido a un archivo llamado `.env` dentro de la carpeta `server/`
2. Completa los valores con tus credenciales reales
3. **NUNCA** subas el archivo `.env` al repositorio (ya está en .gitignore)

---

## 🔧 Variables Requeridas

```env
# ============================================
# SERVIDOR
# ============================================
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# ============================================
# BASE DE DATOS
# ============================================
MONGODB_URI=mongodb://localhost:27017/foro-vivienda

# ============================================
# AUTENTICACIÓN JWT
# ============================================
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui_cambiar_en_produccion
JWT_EXPIRE=7d

# ============================================
# reCAPTCHA v3
# ============================================
RECAPTCHA_SECRET=tu_clave_secreta_de_recaptcha
RECAPTCHA_THRESHOLD=0.5

# ============================================
# EMAIL (Nodemailer)
# ============================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_o_app_password
EMAIL_FROM=Foro Zona Segura <noreply@forozonasegura.com>

# ============================================
# SEGURIDAD
# ============================================
SECURITY_ALERT_EMAIL=admin@forozonasegura.com
SECURITY_ALERTS_ENABLED=true

# ============================================
# RATE LIMIT REPORTES
# ============================================
RATE_REPORT_MAX=10

# ============================================
# TELEGRAM (NOTIFICACION DE REPORTES)
# ============================================
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ============================================
# STORAGE DE ADJUNTOS DE REPORTES
# ============================================
STORAGE_DRIVER=local
```

---

## 📝 Notas Importantes

- **JWT_SECRET**: Genera uno seguro con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- **Gmail**: Requiere App Password (no uses tu contraseña normal)
- **MongoDB**: Para producción, considera MongoDB Atlas

