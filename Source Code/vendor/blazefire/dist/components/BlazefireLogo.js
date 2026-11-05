'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export function BlazefireLogo({ size = 40, className = '', style }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        return _jsx("span", { style: { width: size, height: size, display: 'inline-block' } });
    }
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 40 40", fill: "none", className: className, style: style, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "blazefire-flame", x1: "20", y1: "5", x2: "20", y2: "35", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#ff8800" }), _jsx("stop", { offset: "0.4", stopColor: "#ff4400" }), _jsx("stop", { offset: "0.7", stopColor: "#ff006e" }), _jsx("stop", { offset: "1", stopColor: "#cc00cc" })] }), _jsxs("filter", { id: "blazefire-glow", children: [_jsx("feGaussianBlur", { stdDeviation: "1", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsxs("g", { filter: "url(#blazefire-glow)", children: [_jsx("path", { d: "M20 3C20 3 30 14 30 23C30 28 25.5 32 20 32C14.5 32 10 28 10 23C10 14 20 3 20 3Z", fill: "url(#blazefire-flame)" }), _jsx("path", { d: "M20 11C20 11 25 18 25 23C25 25.8 22.8 28 20 28C17.2 28 15 25.8 15 23C15 18 20 11 20 11Z", fill: "url(#blazefire-flame)", opacity: "0.6" }), _jsx("path", { d: "M20 16C20 16 22.5 20 22.5 23C22.5 24.4 21.4 25.5 20 25.5C18.6 25.5 17.5 24.4 17.5 23C17.5 20 20 16 20 16Z", fill: "#ffcc00", opacity: "0.8" })] })] }));
}
