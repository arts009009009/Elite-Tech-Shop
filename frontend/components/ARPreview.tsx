"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

type ARPreviewProps = {
  productName: string;
};

const _arMv = new Float32Array(16);
const _arRot = new Float32Array(16);
const _arCombined = new Float32Array(16);

export default memo(function ARPreview({ productName }: ARPreviewProps) {
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);
  const shadersRef = useRef<WebGLShader[]>([]);

  const cleanupGL = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const gl = glRef.current;
    if (gl) {
      if (bufRef.current) { gl.deleteBuffer(bufRef.current); bufRef.current = null; }
      if (progRef.current) { gl.deleteProgram(progRef.current); progRef.current = null; }
      for (const s of shadersRef.current) gl.deleteShader(s);
      shadersRef.current = [];
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
      glRef.current = null;
    }
  }, []);

  const handleViewInAR = useCallback(async () => {
    cleanupGL();
    if ("xr" in navigator) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supported = await (navigator as any).xr.isSessionSupported(
          "immersive-ar"
        );
        setArSupported(supported);
        setShowPreview(true);
      } catch {
        setArSupported(false);
        setShowPreview(true);
      }
    } else {
      setArSupported(false);
      setShowPreview(true);
    }
  }, [cleanupGL]);

  useEffect(() => {
    if (!showPreview || arSupported !== true || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const glCtx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!glCtx) return;
    const gl = glCtx;
    glRef.current = gl;

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    const vsSource = `
      attribute vec4 aPosition;
      attribute vec3 aColor;
      uniform mat4 uModelView;
      uniform mat4 uProjection;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        gl_Position = uProjection * uModelView * aPosition;
      }
    `;
    const fsSource = `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    shadersRef.current.push(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    shadersRef.current.push(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    progRef.current = program;

    const vertices = new Float32Array([
      -0.5, -0.5,  0.5,   0, 1, 1,
       0.5, -0.5,  0.5,   0, 1, 1,
       0.5,  0.5,  0.5,   0, 1, 1,
      -0.5, -0.5,  0.5,   0, 1, 1,
       0.5,  0.5,  0.5,   0, 1, 1,
      -0.5,  0.5,  0.5,   0, 1, 1,
      -0.5, -0.5, -0.5,   0.63, 0.31, 1,
       0.5, -0.5, -0.5,   0.63, 0.31, 1,
       0.5,  0.5, -0.5,   0.63, 0.31, 1,
      -0.5, -0.5, -0.5,   0.63, 0.31, 1,
       0.5,  0.5, -0.5,   0.63, 0.31, 1,
      -0.5,  0.5, -0.5,   0.63, 0.31, 1,
      -0.5,  0.5, -0.5,   0.63, 0.31, 1,
      -0.5,  0.5,  0.5,   0.63, 0.31, 1,
       0.5,  0.5,  0.5,   0.63, 0.31, 1,
      -0.5,  0.5, -0.5,   0.63, 0.31, 1,
       0.5,  0.5,  0.5,   0.63, 0.31, 1,
       0.5,  0.5, -0.5,   0.63, 0.31, 1,
      -0.5, -0.5, -0.5,   0, 1, 1,
      -0.5, -0.5,  0.5,   0, 1, 1,
       0.5, -0.5,  0.5,   0, 1, 1,
      -0.5, -0.5, -0.5,   0, 1, 1,
       0.5, -0.5,  0.5,   0, 1, 1,
       0.5, -0.5, -0.5,   0, 1, 1,
    ]);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    bufRef.current = buf;

    const aPos = gl.getAttribLocation(program, "aPosition");
    const aCol = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);

    const uMV = gl.getUniformLocation(program, "uModelView");
    const uProj = gl.getUniformLocation(program, "uProjection");

    const proj = new Float32Array(16);
    const f = 1 / Math.tan(Math.PI / 8);
    const nf = 1 / (0.1 - 100);
    proj[0] = f / (canvas.width / canvas.height); proj[5] = f; proj[10] = (100 + 0.1) * nf; proj[11] = -1; proj[14] = 2 * 100 * 0.1 * nf;
    gl.uniformMatrix4fv(uProj, false, proj);

    let angle = 0;
    let destroyed = false;

    const lookAt = (out: Float32Array, ex: number, ey: number, ez: number) => {
      const zx = ex, zy = ey, zz = ez;
      let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
      const fz0 = zx * len, fz1 = zy * len, fz2 = zz * len;
      const xx = fz2, xy = 0, xz = -fz0;
      len = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz);
      const fx0 = xx * len, fx1 = xy * len, fx2 = xz * len;
      const fy0 = fz1 * fx2 - fz2 * fx1, fy1 = fz2 * fx0 - fz0 * fx2, fy2 = fz0 * fx1 - fz1 * fx0;
      out[0] = fx0; out[1] = fy0; out[2] = fz0; out[3] = 0;
      out[4] = fx1; out[5] = fy1; out[6] = fz1; out[7] = 0;
      out[8] = fx2; out[9] = fy2; out[10] = fz2; out[11] = 0;
      out[12] = -(fx0 * ex + fx1 * ey + fx2 * ez);
      out[13] = -(fy0 * ex + fy1 * ey + fy2 * ez);
      out[14] = -(fz0 * ex + fz1 * ey + fz2 * ez);
      out[15] = 1;
    };

    const rotateY = (out: Float32Array, a: number) => {
      const c = Math.cos(a), s = Math.sin(a);
      out[0] = c; out[1] = 0; out[2] = s; out[3] = 0;
      out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
      out[8] = -s; out[9] = 0; out[10] = c; out[11] = 0;
      out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    };

    const mul4 = (out: Float32Array, a: Float32Array, b: Float32Array) => {
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    };

    function draw() {
      if (destroyed) return;
      angle += 0.01;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      lookAt(_arMv, 0, 0, 2.5);
      rotateY(_arRot, angle);
      mul4(_arCombined, _arMv, _arRot);
      gl.uniformMatrix4fv(uMV, false, _arCombined);
      gl.drawArrays(gl.TRIANGLES, 0, 24);
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => { destroyed = true; };
  }, [showPreview, arSupported]);

  useEffect(() => () => { cleanupGL(); }, [cleanupGL]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <button
        onClick={handleViewInAR}
        style={{
          background: "transparent",
          border: "1px solid var(--accent, #00d4ff)",
          color: "var(--accent, #00d4ff)",
          padding: "10px 24px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: "0 0 12px rgba(0,212,255,0.3), inset 0 0 12px rgba(0,212,255,0.05)",
          transition: "all 0.25s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 20px rgba(0,212,255,0.5), inset 0 0 20px rgba(0,212,255,0.1)";
          e.currentTarget.style.background = "rgba(0,212,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 12px rgba(0,212,255,0.3), inset 0 0 12px rgba(0,212,255,0.05)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        View in AR
      </button>

      {showPreview && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {arSupported === true ? (
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
                background: "#000",
              }}
            />
          ) : (
            <>
              <p
                style={{
                  color: "#ff6b6b",
                  fontSize: "13px",
                  margin: 0,
                  opacity: 0.9,
                }}
              >
                AR not supported on this device
              </p>

              <div style={perspectiveContainerStyle}>
                <div style={cubeSceneStyle}>
                  <div style={cubeStyle}>
                    <div style={{ ...faceStyle, transform: "rotateY(0deg) translateZ(100px)" }}>
                      <span style={faceLabelStyle}>{productName}</span>
                    </div>
                    <div style={{ ...faceStyle, transform: "rotateY(90deg) translateZ(100px)" }} />
                    <div style={{ ...faceStyle, transform: "rotateY(180deg) translateZ(100px)" }}>
                      <span style={faceLabelStyle}>{productName}</span>
                    </div>
                    <div style={{ ...faceStyle, transform: "rotateY(-90deg) translateZ(100px)" }} />
                    <div style={{ ...faceStyle, transform: "rotateX(90deg) translateZ(100px)" }} />
                    <div style={{ ...faceStyle, transform: "rotateX(-90deg) translateZ(100px)" }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes arCubeRotate {
          from { transform: rotateX(-20deg) rotateY(0deg); }
          to { transform: rotateX(-20deg) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
});

const perspectiveContainerStyle: React.CSSProperties = {
  perspective: "600px",
  perspectiveOrigin: "50% 50%",
  width: "200px",
  height: "200px",
};

const cubeSceneStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  transformStyle: "preserve-3d",
};

const cubeStyle: React.CSSProperties = {
  width: "200px",
  height: "200px",
  position: "absolute",
  transformStyle: "preserve-3d",
  animation: "arCubeRotate 6s linear infinite",
};

const faceStyle: React.CSSProperties = {
  position: "absolute",
  width: "200px",
  height: "200px",
  backfaceVisibility: "visible",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(10, 10, 30, 0.85)",
  border: "1px solid rgba(160, 80, 255, 0.5)",
  boxShadow:
    "0 0 15px rgba(160, 80, 255, 0.3), inset 0 0 15px rgba(0, 212, 255, 0.1)",
  boxSizing: "border-box",
};

const faceLabelStyle: React.CSSProperties = {
  color: "#00d4ff",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1px",
  textAlign: "center",
  textShadow: "0 0 8px rgba(0,212,255,0.7)",
  padding: "0 12px",
  lineHeight: 1.3,
};
