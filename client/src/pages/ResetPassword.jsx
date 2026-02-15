import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Auth/Auth.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token'); // viene de ?token=...

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!token) {
      setError('Token de recuperación no válido.');
      return;
    }

    setLoading(true);

    try {
      // ✅ 1. Comprobar que reCAPTCHA está cargado
      if (!window.grecaptcha) {
        setError('reCAPTCHA no está cargado. Recarga la página.');
        return;
      }

      // ✅ 2. Obtener token reCAPTCHA v3
      const recaptchaToken = await window.grecaptcha.execute(
        process.env.REACT_APP_RECAPTCHA_SITE_KEY,
        { action: 'reset_password' }
      );

      // ✅ 3. Enviar token + password al backend
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password,
        recaptchaToken // 🔐 MUY IMPORTANTE
      });

      setMessage(
        response.data.message || 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
      );
      setPassword('');
      setPassword2('');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Establecer nueva contraseña</h2>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password2" className="form-label">
                Repetir contraseña
              </label>
              <input
                id="password2"
                type="password"
                className="form-input"
                placeholder="******"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Ir al login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
