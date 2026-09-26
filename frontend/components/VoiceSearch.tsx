"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

interface VoiceSearchProps {
  onResult: (text: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

const VoiceSearch = memo(function VoiceSearch({ onResult }: VoiceSearchProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return;

    if (listening) {
      recognitionRef.current.abort();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [listening, supported]);

  return (
    <>
      <style>{`
        @keyframes voice-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
        }
      `}</style>
      <button
        type="button"
        onClick={toggleListening}
        disabled={!supported}
        title={
          supported
            ? listening
              ? "Stop listening"
              : "Start voice search"
            : "Voice search is not supported in this browser"
        }
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: listening
            ? "1px solid #ff4444"
            : "1px solid var(--accent, #00d4ff)",
          background: listening ? "#ff4444" : "transparent",
          color: "#fff",
          fontSize: 18,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: supported ? "pointer" : "not-allowed",
          opacity: supported ? 1 : 0.5,
          animation: listening ? "voice-pulse 1.5s infinite" : "none",
          padding: 0,
          outline: "none",
        }}
      >
        🎤
      </button>
    </>
  );
});

export default VoiceSearch;
