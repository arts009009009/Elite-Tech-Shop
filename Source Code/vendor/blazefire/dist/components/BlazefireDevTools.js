'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { BlazefireLogo } from './BlazefireLogo';
export function BlazefireDevTools({ position = 'bottom-right' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted)
        return null;
    const positionStyles = {
        'bottom-right': { bottom: 20, right: 20 },
        'bottom-left': { bottom: 20, left: 20 },
        'top-right': { top: 20, right: 20 },
        'top-left': { top: 20, left: 20 },
    };
    return (_jsxs("div", { style: { position: 'fixed', ...positionStyles[position], zIndex: 2147483647 }, children: [isOpen && (_jsxs("div", { role: "dialog", "aria-label": "Blazefire Dev Tools", style: {
                    width: 360,
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(0,255,255,0.35)',
                    borderRadius: 12,
                    boxShadow: '0 0 24px rgba(0,255,255,0.2)',
                    color: '#e6f7ff',
                    overflow: 'hidden',
                    marginBottom: 12,
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(0,255,255,0.2)',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(BlazefireLogo, { size: 20 }), _jsx("strong", { style: { fontSize: 14 }, children: "Blazefire" })] }), _jsx("button", { type: "button", onClick: () => setIsOpen(false), "aria-label": "Close Blazefire Dev Tools", style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 20,
                                }, children: "\u00D7" })] }), _jsxs("div", { style: { padding: 16 }, children: [_jsx("div", { style: { fontSize: 12, color: '#9ad9ff', marginBottom: 12 }, children: "Version 1.0.0 \u00B7 Frostfast" }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("a", { href: "https://blazefire.dev", target: "_blank", rel: "noreferrer", style: { color: '#00ffff', fontSize: 12 }, children: "Docs" }), _jsx("a", { href: "https://github.com/arts009009009/Blazefire", target: "_blank", rel: "noreferrer", style: { color: '#00ffff', fontSize: 12 }, children: "GitHub" })] })] })] })), _jsx("button", { onClick: () => setIsOpen(!isOpen), "aria-label": `${isOpen ? 'Close' : 'Open'} Blazefire Dev Tools`, style: {
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
                }, children: _jsx(BlazefireLogo, { size: 28 }) })] }));
}
