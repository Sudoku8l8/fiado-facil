// ============================================================
// Flash Fiado — Login Page
// Sprint 1: Autenticación con email/password
// ============================================================
import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

export function Login() {
  const { signIn, error, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await signIn(email, password);
  };

  return (
    <div className="login-page">
      {/* Fondo decorativo */}
      <div className="login-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>

      <div className="login-container animate-fade-up">
        {/* Logo */}
        <div className="login-logo">
          <span className="logo-flash">⚡</span>
          <div>
            <h1 className="login-title">Flash Fiado</h1>
            <p className="login-subtitle body-sm text-muted">Libreta digital de créditos</p>
          </div>
        </div>

        {/* Card de login */}
        <div className="login-card card">
          <h2 className="heading-sm" style={{ marginBottom: 'var(--space-5)' }}>Iniciar sesión</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error animate-fade-in" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !email || !password}
            >
              {loading ? <div className="spinner spinner-sm" /> : null}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="login-footer text-muted body-sm">
          ¿No tienes cuenta? Pide al dueño que te agregue.
        </p>
      </div>
    </div>
  );
}
