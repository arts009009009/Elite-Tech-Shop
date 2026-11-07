"use client";

import { useEffect, useRef, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function WebRtcChat({ room = "support" }: { room?: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const peerIdRef = useRef(`peer-${Math.random().toString(36).slice(2)}`);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    const config: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    const dc = pc.createDataChannel("chat");
    dcRef.current = dc;
    dc.onopen = () => setMessages([...messages, "system: connected (P2P)"]);
    dc.onmessage = (e) => setMessages((m) => [...m, `peer: ${e.data}`]);

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        zigPlatform.webrtcSignal(room, peerIdRef.current, JSON.stringify(ev.candidate));
      }
    };

    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => {
      zigPlatform.webrtcSignal(room, peerIdRef.current, JSON.stringify(pc.localDescription));
    });

    return () => {
      dc.close();
      pc.close();
    };
  }, [room]);

  const send = () => {
    if (!input.trim() || !dcRef.current) return;
    dcRef.current.send(input);
    setMessages((m) => [...m, `me: ${input}`]);
    setInput("");
  };

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40 flex flex-col h-96">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">P2P Live Chat (WebRTC)</h3>
      <div className="flex-1 overflow-y-auto mb-2 space-y-1 p-2 rounded bg-gray-800/50 text-xs text-gray-300">
        {messages.map((m, i) => (
          <div key={i} className={m.startsWith("me") ? "text-right text-cyan-300" : "text-left text-gray-300"}>
            {m}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button onClick={send} disabled={!input.trim() || !dcRef.current?.readyState === "open"}
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          Send
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-1">Peer: {peerIdRef.current}</p>
    </section>
  );
}
