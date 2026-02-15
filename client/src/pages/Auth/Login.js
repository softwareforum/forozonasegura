import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!window.grecaptcha) {
        setError('reCAPTCHA no esta cargado. Recarga la pagina.');
        setLoading(false);
        return;
      }

      const recaptchaToken = await window.grecaptcha.execute(
        process.env.REACT_APP_RECAPTCHA_SITE_KEY,
        { action: 'login' }
      );

      const result = await login(
        formData.email,
        formData.password,
        recaptchaToken
      );

      if (result.success) {
        navigate('/');
      } else if (result.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/check-email', { state: { email: formData.email } });
      } else {
        setError(result.message);
      }
    } catch (_err) {
      setError('Error de seguridad. Intentalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Iniciar sesion</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contrasena</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="auth-footer">
          Has olvidado tu contrasena?{' '}
          <Link to="/forgot-password">Recuperala aqui</Link>
        </p>

        <p className="auth-footer">
          No tienes cuenta? <Link to="/register">Registrate aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
