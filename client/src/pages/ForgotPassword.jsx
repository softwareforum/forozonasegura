// client/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth/Auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      // 1) Comprobar que reCAPTCHA cargó
      if (!window.grecaptcha) {
        setError('reCAPTCHA no está cargado. Recarga la página.');
        return;
      }

      // 2) Pedir token v3 (acción: forgot_password)
      const recaptchaToken = await window.grecaptcha.execute(
        process.env.REACT_APP_RECAPTCHA_SITE_KEY,
        { action: 'forgot_password' }
      );

      // 3) Enviar email + recaptchaToken al backend
      const response = await axios.post('/api/auth/forgot-password', {
        email,
        recaptchaToken
      });

      setMessage(response.data.message || 'Si el email existe, hemos enviado instrucciones para restablecer tu contraseña.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al solicitar el restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Recuperar contraseña</h2>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email con el que te registraste
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-input"
              placeholder="tuemail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya la recuerdas? <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
