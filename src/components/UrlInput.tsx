'use client';

import { useState, useRef, FormEvent } from 'react';

interface UrlInputProps {
  onExtract: (url: string) => Promise<void>;
  loading: boolean;
  placeholder?: string;
  size?: 'default' | 'hero';
}

export default function UrlInput({
  onExtract,
  loading,
  placeholder = 'Paste any recipe URL or YouTube link...',
  size = 'default',
}: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function isValidUrl(str: string) {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please paste a URL first');
      inputRef.current?.focus();
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    await onExtract(trimmed);
  }

  const isHero = size === 'hero';

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: isHero ? 'column' : 'row',
        gap: isHero ? 12 : 8,
        width: '100%',
      }}
    >
      <div style={{ position: 'relative', flex: 1 }}>
        {/* URL type icon */}
        <span style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 18,
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          {url.includes('youtube.com') || url.includes('youtu.be') ? '▶️' :
           url.includes('tiktok.com') ? '🎵' :
           url.includes('instagram.com') ? '📸' : '🔗'}
        </span>

        <input
          ref={inputRef}
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          placeholder={placeholder}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
          className="input"
          style={{
            paddingLeft: 48,
            paddingRight: 16,
            fontSize: isHero ? 16 : 15,
            height: isHero ? 60 : 48,
            borderRadius: isHero ? 'var(--radius-lg)' : 'var(--radius-md)',
          }}
        />

        {url && !loading && (
          <button
            type="button"
            onClick={() => { setUrl(''); setError(''); inputRef.current?.focus(); }}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Clear URL"
          >
            ✕
          </button>
        )}
      </div>

      <button
        id="extract-btn"
        type="submit"
        disabled={loading || !url.trim()}
        className="btn btn-primary"
        style={{
          height: isHero ? 60 : 48,
          padding: isHero ? '0 36px' : '0 24px',
          fontSize: isHero ? 16 : 14,
          borderRadius: isHero ? 'var(--radius-lg)' : 'var(--radius-md)',
          minWidth: isHero ? 180 : 140,
          justifyContent: 'center',
          animation: !loading && url ? 'pulse-glow 2s ease-in-out infinite' : 'none',
        }}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Extracting...
          </>
        ) : (
          '✨ De-Bloat Recipe'
        )}
      </button>

      {error && (
        <p style={{
          color: 'var(--error)',
          fontSize: 13,
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          ⚠️ {error}
        </p>
      )}
    </form>
  );
}
