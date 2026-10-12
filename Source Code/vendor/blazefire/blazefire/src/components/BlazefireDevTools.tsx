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
    <button
      onClick={() => setIsOpen(!isOpen)}
      aria-label={`${isOpen ? 'Close' : 'Open'} Blazefire Dev Tools`}
      style={{
        position: 'fixed',
        ...positionStyles[position],
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
  );
}
