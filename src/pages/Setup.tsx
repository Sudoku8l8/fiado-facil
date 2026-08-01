// ============================================================
// Flash Fiado — Setup Page (configuración inicial)
// Sprint 5: Se muestra tras el primer login si no hay perfil
// ============================================================
import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Setup.css';

export function Setup() {
  const { firebaseUser, createUserProfile, loading } = useAuth();
  const [nombre, setNombre]       = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError]         = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !storeName.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (!firebaseUser) return;

    try {
      await createUserProfile(firebaseUser.uid, nombre.trim(), storeName.trim());
    } catch {
      setError('Error al guardar el perfil. Intenta de nuevo.');
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-bg">
        <div className="bg-orb bg-orb-1" />
      </div>

      <div className="setup-container animate-fade-up">
        <div className="setup-logo">
          <span style={{ fontSize: '3rem' }}>⚡</span>
          <h1 className="heading-lg">¡Bienvenido!</h1>
          <p className="body-sm text-muted">Configura tu tienda para comenzar</p>
        </div>

        <div className="card setup-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" htmlFor="setup-nombre">Tu nombre</label>
              <input
                id="setup-nombre"
                className="input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Carlos"
                autoFocus
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" htmlFor="setup-store">Nombre de tu tienda</label>
              <input
                id="setup-store"
                className="input"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej: Bodega La Esperanza"
                required
              />
            </div>

            {error && (
              <div className="login-error animate-fade-in" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? <div className="spinner spinner-sm" /> : null}
              {loading ? 'Guardando…' : 'Comenzar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
