import React, { useState, useCallback } from 'react';

const HASH_ENV = process.env.REACT_APP_PASSWORD_HASH ?? '';

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface Props {
  children: React.ReactNode;
}

export const LoginGate: React.FC<Props> = ({ children }) => {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    const hash = await sha256Hex(input.trim());
    if (hash === HASH_ENV) {
      setAuthed(true);
    } else {
      setError('Incorrect password.');
      setInput('');
    }
    setLoading(false);
  }, [input]);

  if (authed || !HASH_ENV) return <>{children}</>;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0f1e',
    }}>
      <div style={{
        background: '#0d1630',
        border: '1px solid #243056',
        borderRadius: '12px',
        padding: '40px 44px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <img
          src="/logo.png"
          alt="Anteraja"
          style={{ height: '40px', display: 'block', marginBottom: '28px' }}
        />
        <h1 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '6px',
          fontFamily: "'Alliance No. 2', sans-serif",
        }}>
          Dashboard Access
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '28px' }}>
          Enter your password to continue.
        </p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            placeholder="Password"
            autoFocus
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: error ? '1px solid #f87171' : '1px solid #243056',
              background: '#131d3b',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: error ? '8px' : '20px',
              fontFamily: 'monospace',
            }}
          />
          {error && (
            <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '16px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: loading || !input.trim() ? '#243056' : '#ca8a04',
              color: loading || !input.trim() ? '#6b7280' : '#0a0f1e',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontFamily: "'Alliance No. 2', sans-serif",
              letterSpacing: '0.5px',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
      <p style={{ marginTop: '24px', fontSize: '11px', color: '#374151' }}>
        Anteraja App Monthly AMA Dashboard
      </p>
    </div>
  );
};
