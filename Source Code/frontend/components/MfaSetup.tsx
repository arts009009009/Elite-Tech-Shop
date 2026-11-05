"use client";

import { useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function MfaSetup() {
  const [secret, setSecret] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    zigPlatform.mfaSetup().then(async (res) => {
      const json = await res.json();
      setSecret(json.secret);
      setQrUrl(json.qr_url);
    });
  }, []);

  const verify = async () => {
    setLoading(true);
    try {
      const res = await zigPlatform.mfaVerify(token);
      const json = await res.json();
      setVerified(Boolean(json.valid));
    } catch {
      setVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">Two-Factor Authentication</h3>
      {secret && (
        <>
          <p className="text-xs text-gray-400 mb-2">Scan with your authenticator app:</p>
          <img
            src={`https://chart.googleapis.com/chart?chs=200x200&chld=L|0&cht=qr&chl=${encodeURIComponent(qrUrl)}`}
            alt="MFA QR code"
            className="w-24 h-24 mb-2 rounded border"
          />
          <p className="text-xs font-mono text-gray-300 truncate max-w-xs mb-3">Secret: {secret}</p>
        </>
      )}
      <div className="flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="6-digit code"
          maxLength={6}
          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          disabled={loading || !token}
          onClick={verify}
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </div>
      {verified !== null && (
        <p className={`mt-2 text-xs font-bold ${verified ? "text-green-400" : "text-red-400"}`}>
          {verified ? "MFA verified ✅" : "Invalid code ❌"}
        </p>
      )}
    </section>
  );
}
