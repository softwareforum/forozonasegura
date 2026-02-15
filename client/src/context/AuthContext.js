import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [securityNotice, setSecurityNotice] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(localStorage.getItem('pending_verification_email') || '');
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const persistVerificationEmail = (email) => {
    const safeEmail = String(email || '').trim().toLowerCase();
    if (!safeEmail) return;
    localStorage.setItem('pending_verification_email', safeEmail);
    setVerificationEmail(safeEmail);
  };

  const clearVerificationEmail = () => {
    localStorage.removeItem('pending_verification_email');
    setVerificationEmail('');
  };

  const clearAuthState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const scheduleMeRetry = (retryAfterSeconds) => {
    const serverDelay = Number.parseInt(retryAfterSeconds, 10);
    const baseDelayMs = Number.isFinite(serverDelay) && serverDelay > 0 ? serverDelay * 1000 : 3000;
    const delayMs = Math.min(baseDelayMs * (retryCountRef.current + 1), 30000);
    retryCountRef.current += 1;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    retryTimeoutRef.current = setTimeout(() => {
      fetchUser();
    }, delayMs);
  };

  const fetchUser = async () => {
    let keepLoading = false;
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      setSecurityNotice('');
      retryCountRef.current = 0;
      if (response.data.user?.isVerified) {
        clearVerificationEmail();
      }
    } catch (error) {
      const status = error.response?.status;
      const code = error.response?.data?.code;
      if (status === 401) {
        clearAuthState();
      } else if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
        const emailFromCache = user?.email || verificationEmail;
        if (emailFromCache) {
          persistVerificationEmail(emailFromCache);
        }
        clearAuthState();
        setSecurityNotice('Cuenta no verificada. Revisa tu correo o solicita un nuevo email de verificacion.');
      } else if (status === 429) {
        const retryAfterSeconds = error.response?.data?.retryAfterSeconds || error.response?.headers?.['retry-after'];
        setSecurityNotice('Estas navegando muy rapido, espera unos segundos.');
        scheduleMeRetry(retryAfterSeconds);
        keepLoading = !user;
      } else {
        setSecurityNotice('No se pudo refrescar la sesion. Intenta de nuevo en unos segundos.');
      }
    } finally {
      if (!keepLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token) {
      setLoading(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [token]);

  const login = async (email, password, recaptchaToken) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        recaptchaToken
      });

      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setUser(userData);
      clearVerificationEmail();

      return { success: true };
    } catch (error) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message || 'Error al iniciar sesion';

      if (code === 'EMAIL_NOT_VERIFIED') {
        persistVerificationEmail(email);
      }

      return {
        success: false,
        code,
        message
      };
    }
  };

  const register = async (username, email, password, recaptchaToken) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password,
        recaptchaToken,
      });

      persistVerificationEmail(email);
      return {
        success: true,
        message: response.data?.message || 'Revisa tu email para verificar la cuenta'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrarse'
      };
    }
  };

  const resendVerification = async (email) => {
    const targetEmail = String(email || verificationEmail || '').trim().toLowerCase();
    try {
      const response = await axios.post('/api/auth/resend-verification', {
        email: targetEmail || undefined
      });
      if (targetEmail) {
        persistVerificationEmail(targetEmail);
      }
      return {
        success: true,
        message: response.data?.message || 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'No se pudo reenviar el email de verificacion.'
      };
    }
  };

  const logout = () => {
    clearAuthState();
    setSecurityNotice('');
  };

  const updateUserData = (partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUserData,
      resendVerification,
      securityNotice,
      verificationEmail,
      clearSecurityNotice: () => setSecurityNotice('')
    }}>
      {children}
    </AuthContext.Provider>
  );
};
