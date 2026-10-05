import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { EditorialApp } from './editorial/EditorialApp.tsx';

export const RootDispatcher: React.FC = () => {
  const [version, setVersion] = useState<'v1' | 'v2'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v');
    if (vParam === 'editorial' || vParam === '2' || vParam === 'v2') return 'v2';
    if (vParam === 'v1' || vParam === '1') return 'v1';
    return (localStorage.getItem('thought_sculptor_version') as 'v1' | 'v2') || 'v2';
  });

  const switchToV1 = () => {
    localStorage.setItem('thought_sculptor_version', 'v1');
    setVersion('v1');
  };

  const switchToV2 = () => {
    localStorage.setItem('thought_sculptor_version', 'v2');
    setVersion('v2');
  };

  return (
    <>
      {version === 'v2' ? (
        <EditorialApp onSwitchToV1={switchToV1} />
      ) : (
        <>
          <App />
          {/* Subtle floating switcher on V1 to open V2 Editorial concept */}
          <div
            style={{
              position: 'fixed',
              top: '14px',
              right: '28px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #D8D2C4',
              borderRadius: '999px',
              padding: '3px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#6C707A' }}>
              ДИЗАЙН:
            </span>
            <button
              type="button"
              style={{
                background: '#141518',
                color: '#FAF9F6',
                border: 'none',
                borderRadius: '999px',
                padding: '2px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              V1 Галерея
            </button>
            <button
              type="button"
              onClick={switchToV2}
              style={{
                background: 'transparent',
                color: '#BA5D38',
                border: 'none',
                borderRadius: '999px',
                padding: '2px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Перейти во вторую версию (Научная монография V2)"
            >
              V2 Монография ↗
            </button>
          </div>
        </>
      )}
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootDispatcher />
  </StrictMode>
);
