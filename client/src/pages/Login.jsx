import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      toast.success(mode === 'login' ? 'Access granted' : 'Account created');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid lines */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-accent opacity-20" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-accent opacity-20" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 border border-accent/30 mb-4 relative">
            <span className="text-accent text-2xl font-mono">⬡</span>
            <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-accent" />
            <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-accent" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-widest uppercase text-text-primary">
            SentinelOps
          </h1>
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Defence-Grade Anomaly Detection
          </p>
        </div>

        {/* Card */}
        <div className="card corner-accent p-6">
          <div className="flex border border-border mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                  mode === m ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="input-label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="operator_01"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  minLength={3}
                />
              </div>
            )}
            <div>
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="analyst@sentinelops.mil"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? '⟳ Authenticating...' : mode === 'login' ? '→ Authenticate' : '→ Create Account'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-xs text-text-muted text-center font-mono">
              First registered user receives <span className="text-accent">admin</span> clearance
            </p>
          )}
        </div>

        <p className="text-center text-xs font-mono text-text-muted mt-6">
          CLASSIFICATION: INTERNAL USE ONLY
        </p>
      </div>
    </div>
  );
}
