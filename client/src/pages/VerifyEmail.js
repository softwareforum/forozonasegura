import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Auth/Auth.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { resendVerification, verificationEmail } = useContext(AuthContext);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verificando email...');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const token = searchParams.get('token');

    const verifyToken = async () => {
      if (!token) {
        if (!mounted) return;
        setStatus('error');
        setMessage('Token invalido o expirado');
        return;
      }

      try {
        const response = await axios.get('/api/auth/verify-email', {
          params: { token }
        });

        if (!mounted) return;
        setStatus('success');
        setMessage(response.data?.message || 'Email verificado correctamente');
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Token invalido o expirado');
      }
    };

    verifyToken();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleResend = async () => {
    setResendLoading(true);
    const result = await resendVerification(verificationEmail);
    setMessage(result.message || 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.');
    setResendLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verificacion de email</h2>

        {status === 'loading' && <p className="auth-footer">Verificando email...</p>}

        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <Link to="/login" className="btn btn-primary btn-block">
              Ir a iniciar sesion
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? 'Enviando...' : 'Reenviar email'}
            </button>
            <p className="auth-footer">
              <Link to="/check-email">Ir a comprobacion de correo</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
