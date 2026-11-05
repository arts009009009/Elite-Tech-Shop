'use client';

import React, { useState, useEffect } from 'react';
import { BlazefireLogo } from './BlazefireLogo';

export interface BlazefireDevToolsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function BlazefireDevTools({ position = 'bottom-right' }: BlazefireDevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  return (
    <div style={{ position: 'fixed', ...positionStyles[position], zIndex: 2147483647 }}>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Blazefire Dev Tools"
          style={{
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(0,255,255,0.35)',
            borderRadius: 12,
            boxShadow: '0 0 24px rgba(0,255,255,0.2)',
            color: '#e6f7ff',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BlazefireLogo size={20} />
              <strong style={{ fontSize: 14 }}>Blazefire</strong>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Blazefire Dev Tools"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 20,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#9ad9ff', marginBottom: 12 }}>Version 1.0.0 · Frostfast</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="https://blazefire.dev" target="_blank" rel="noreferrer" style={{ color: '#00ffff', fontSize: 12 }}>Docs</a>
              <a href="https://github.com/arts009009009/Blazefire" target="_blank" rel="noreferrer" style={{ color: '#00ffff', fontSize: 12 }}>GitHub</a>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${isOpen ? 'Close' : 'Open'} Blazefire Dev Tools`}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#000',
          border: '1px solid rgba(0,255,255,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 10px rgba(0,255,255,0.3)',
          zIndex: 2147483647,
        }}
      >
        <BlazefireLogo size={28} />
      </button>
    </div>
  );
}
