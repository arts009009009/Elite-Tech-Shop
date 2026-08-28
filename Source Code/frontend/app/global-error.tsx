"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center h-screen text-center p-6 font-mono bg-[#050508] text-[#e0e0e0]">
          <h1 className="text-[48px] my-0 mb-4 text-[#ff0040]" style={{ textShadow: "0 0 20px #ff0040" }}>
            SYSTEM CRASH
          </h1>
          <p className="text-sm text-[#888] mb-2">
            A critical error occurred. The application needs to restart.
          </p>
          {error.digest && (
            <p className="text-xs text-[#555] mb-6">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="px-8 py-3 text-sm font-mono border-2 border-[#00d4ff] bg-transparent text-[#00d4ff] cursor-pointer rounded"
          >
            RESTART APPLICATION
          </button>
        </div>
      </body>
    </html>
  );
}
