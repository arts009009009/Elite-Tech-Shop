'use client';

import React, { useState, useEffect } from 'react';
import { BlazefireLogo } from './BlazefireLogo.js';

var positionStyles = {
  'bottom-right': { bottom: 20, right: 20 },
  'bottom-left': { bottom: 20, left: 20 },
  'top-right': { top: 20, right: 20 },
  'top-left': { top: 20, left: 20 },
};

export function BlazefireDevTools(props) {
  var position = props.position || 'bottom-right';
  var isOpenState = useState(false);
  var setIsOpen = isOpenState[1];
  var mountedState = useState(false);
  var setMounted = mountedState[1];

  useEffect(function () {
    setMounted(true);
  }, []);

  if (!mountedState[0]) return null;

  return React.createElement('button', {
    onClick: function () { setIsOpen(function (v) { return !v; }); },
    'aria-label': (isOpenState[0] ? 'Close' : 'Open') + ' Blazefire Dev Tools',
    style: Object.assign({
      position: 'fixed',
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
    }, positionStyles[position])
  },
    React.createElement(BlazefireLogo, { size: 28 })
  );
}
