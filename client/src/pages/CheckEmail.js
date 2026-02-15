import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Auth/Auth.css';

const CheckEmail = () => {
  const location = useLocation();
  const { verificationEmail, resendVerification } = useContext(AuthContext);
  const [emailInput, setEmailInput] = useState(location.state?.email || verificationEmail || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const result = await resendVerification(emailInput);
    if (result.success) {
      setMessage(result.message || 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.');
    } else {
      setError(result.message || 'No se pudo reenviar el email de verificacion.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verifica tu cuenta</h2>

        <p className="auth-footer">
          Debes verificar tu email para poder acceder a las rutas protegidas.
        </p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={handleResend} disabled={loading}>
          {loading ? 'Enviando...' : 'Reenviar email de verificacion'}
        </button>

        <p className="auth-footer">
          Ya verificaste tu cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </div>
    </div>
  );
};

export default CheckEmail;
