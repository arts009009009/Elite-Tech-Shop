'use client';

import React, { useState, useEffect } from 'react';
import { BlazefireLogo } from './BlazefireLogo';

export interface BlazefireErrorOverlayProps {
  errorType: string;
  errorMessage: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function BlazefireErrorOverlay({
  errorType,
  errorMessage,
  onClose,
  children,
}: BlazefireErrorOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
      }}
    >
      <div
        style={{
          background: '#000',
          border: '1px solid rgba(0,255,255,0.2)',
          borderRadius: 8,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 0 30px rgba(0,255,255,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(0,255,255,0.05), rgba(255,0,255,0.05))',
            borderBottom: '1px solid rgba(0,255,255,0.15)',
          }}
        >
          <BlazefireLogo size={28} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              background: 'linear-gradient(90deg, #ff8800, #ff006e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase' as const,
            }}
          >
            Blazefire
          </span>
        </div>
        <div style={{ padding: 16 }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,0,110,0.15)',
              fontWeight: 600,
              fontSize: 12,
              color: '#ff006e',
              border: '1px solid rgba(255,0,110,0.3)',
            }}
          >
            {errorType}
          </span>
          <div
            style={{
              marginTop: 12,
              color: '#ff006e',
              fontWeight: 500,
              fontSize: 16,
              lineHeight: '24px',
            }}
          >
            {errorMessage}
          </div>
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
