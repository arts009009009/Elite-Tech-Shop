'use client';

import React, { useState, useEffect } from 'react';
import { BlazefireLogo } from './BlazefireLogo.js';

export function BlazefireErrorOverlay(props) {
  var errorType = props.errorType;
  var errorMessage = props.errorMessage;
  var onClose = props.onClose;
  var children = props.children;
  var mounted = useState(false);
  var setMounted = mounted[1];

  useEffect(function () {
    setMounted(true);
  }, []);

  if (!mounted[0]) return null;

  return React.createElement('div', {
    style: {
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
    }
  },
    React.createElement('div', {
      style: {
        background: '#000',
        border: '1px solid rgba(0,255,255,0.2)',
        borderRadius: 8,
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 0 30px rgba(0,255,255,0.15)',
        position: 'relative',
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(0,255,255,0.05), rgba(255,0,255,0.05))',
          borderBottom: '1px solid rgba(0,255,255,0.15)',
        }
      },
        React.createElement(BlazefireLogo, { size: 28 }),
        React.createElement('span', {
          style: {
            fontSize: 14,
            fontWeight: 600,
            background: 'linear-gradient(90deg, #ff8800, #ff006e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textTransform: 'uppercase',
          }
        }, 'Blazefire')
      ),
      React.createElement('div', { style: { padding: 16 } },
        React.createElement('span', {
          style: {
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(255,0,110,0.15)',
            fontWeight: 600,
            fontSize: 12,
            color: '#ff006e',
            border: '1px solid rgba(255,0,110,0.3)',
          }
        }, errorType),
        React.createElement('div', {
          style: {
            marginTop: 12,
            color: '#ff006e',
            fontWeight: 500,
            fontSize: 16,
            lineHeight: '24px',
          }
        }, errorMessage),
        children
      ),
      onClose && React.createElement('button', {
        onClick: onClose,
        style: {
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          fontSize: 18,
        }
      }, '\u00d7')
    )
  );
}
