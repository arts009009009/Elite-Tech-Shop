/**
 * Blazefire Framework - SSR-Safe Entry Point
 * Powered by Frostfast compiler
 */

import React, { createContext, useContext, useEffect } from 'react';

// ===== Constants =====
export const BLAZEFIRE_VERSION = '1.0.0';
export const FROSTFAST_VERSION = '1.0.0';

// ===== SSR-Safe Style Injection =====
export function insertBlazefireStyles() {
  if (typeof document === 'undefined') return;

  var existing = document.getElementById('blazefire-styles');
  if (existing) return;

  var style = document.createElement('style');
  style.id = 'blazefire-styles';
  style.textContent = getBlazefireCSS();
  document.head.appendChild(style);
}

function getBlazefireCSS() {
  return `
    :root {
      --blazefire-cyan: #00ffff;
      --blazefire-magenta: #ff00ff;
      --blazefire-red: #ff006e;
      --blazefire-green: #00ff41;
      --blazefire-orange: #ff8800;
      --blazefire-background: #000000;
      --blazefire-surface: #050505;
      --blazefire-text: #e0e0e0;
      --glow-cyan: 0 0 10px rgba(0,255,255,0.3), 0 0 20px rgba(0,255,255,0.1);
      --glow-magenta: 0 0 10px rgba(255,0,255,0.3), 0 0 20px rgba(255,0,255,0.1);
    }
    body::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #ff8800, #ff006e, #00ffff, #ff00ff);
      z-index: 2147483647;
      pointer-events: none;
    }
    @keyframes blazefire-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes blazefire-glow {
      0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
      50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.6), 0 0 30px rgba(255, 0, 255, 0.3); }
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #000000; }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #00ffff, #ff00ff);
      border-radius: 3px;
    }
    html { color-scheme: dark; }
  `;
}

// ===== SSR-Safe Logo =====
export function createBlazefireLogo(size) {
  size = size || 40;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<linearGradient id="bf-flame" x1="20" y1="5" x2="20" y2="35" gradientUnits="userSpaceOnUse">' +
        '<stop stop-color="#ff8800"/>' +
        '<stop offset="0.4" stop-color="#ff4400"/>' +
        '<stop offset="0.7" stop-color="#ff006e"/>' +
        '<stop offset="1" stop-color="#cc00cc"/>' +
      '</linearGradient>' +
      '<filter id="bf-glow">' +
        '<feGaussianBlur stdDeviation="1" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
    '</defs>' +
    '<g filter="url(#bf-glow)">' +
      '<path d="M20 3C20 3 30 14 30 23C30 28 25.5 32 20 32C14.5 32 10 28 10 23C10 14 20 3 20 3Z" fill="url(#bf-flame)"/>' +
      '<path d="M20 11C20 11 25 18 25 23C25 25.8 22.8 28 20 28C17.2 28 15 25.8 15 23C15 18 20 11 20 11Z" fill="url(#bf-flame)" opacity="0.6"/>' +
      '<path d="M20 16C20 16 22.5 20 22.5 23C22.5 24.4 21.4 25.5 20 25.5C18.6 25.5 17.5 24.4 17.5 23C17.5 20 20 16 20 16Z" fill="#ffcc00" opacity="0.8"/>' +
    '</g>' +
  '</svg>';
}

// ===== Compiler Factory =====
export function createCompiler(options) {
  options = options || {};
  var defaultOptions = {
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'es6' },
  };

  var merged = Object.assign({}, defaultOptions, options);

  return {
    options: merged,
    version: FROSTFAST_VERSION,
    transform: function (code, filename) {
      return Promise.resolve({ code: code });
    },
  };
}

// ===== BlazefireProvider (React Context) =====
var BlazefireContext = createContext({
  version: BLAZEFIRE_VERSION,
  compiler: 'frostfast',
  runtime: 'blazefire',
});

export function useBlazefire() {
  return useContext(BlazefireContext);
}

function BlazefireDevToolsAuto() {
  var isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
  if (!isDev) return null;
  return React.createElement('div', {
    'data-blazefire-devtools': true,
    style: { position: 'fixed', bottom: 20, right: 20, zIndex: 2147483647 },
    'aria-label': 'Blazefire Dev Tools',
  });
}

export function BlazefireProvider(props) {
  useEffect(function () {
    insertBlazefireStyles();
  }, []);

  return React.createElement(
    BlazefireContext.Provider,
    { value: { version: BLAZEFIRE_VERSION, compiler: 'frostfast', runtime: 'blazefire' } },
    props.children,
    React.createElement(BlazefireDevToolsAuto, null)
  );
}

// ===== Default Export =====
var Blazefire = {
  version: BLAZEFIRE_VERSION,
  createCompiler: createCompiler,
  insertBlazefireStyles: insertBlazefireStyles,
  createBlazefireLogo: createBlazefireLogo,
  BlazefireProvider: BlazefireProvider,
  useBlazefire: useBlazefire,
};

export default Blazefire;
