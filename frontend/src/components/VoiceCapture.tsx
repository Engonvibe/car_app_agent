import { useRef, useState } from "react";
import { MicIcon } from "./Icons";

interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
}

/**
 * Microphone button using the browser Web Speech API.
 *
 * - If speech recognition isn't available, it shows a friendly message and the
 *   manual form keeps working (this component never blocks typing).
 * - When the user finishes speaking, the final transcript is passed to
 *   onTranscript so the parent can fill the form for review.
 */
export default function VoiceCapture({ onTranscript }: VoiceCaptureProps) {
  // Detect support once.
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);

  function start() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";
    rec.onresult = (e: any) => {
      let intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else intr += r[0].transcript;
      }
      setInterim(intr);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (finalText.trim()) onTranscript(finalText.trim());
    };

    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    recRef.current?.stop();
  }

  if (!supported) {
    return (
      <div className="voice-box">
        <button type="button" className="mic-btn" disabled aria-label="Voice input unavailable">
          <MicIcon size={24} />
        </button>
        <div className="field-hint">
          Voice input isn't supported in this browser. You can still fill the form
          manually below. (Try Chrome on Android or desktop.)
        </div>
      </div>
    );
  }

  return (
    <div className="voice-box">
      <button
        type="button"
        className={`mic-btn ${listening ? "listening" : ""}`}
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop listening" : "Start voice input"}
      >
        <MicIcon size={24} />
      </button>
      <div className="field-hint">
        {listening
          ? "Listening… tap to stop."
          : 'Tap the mic and speak. Example: "Oil change for Ford Focus on 12 May 2024, amount 120 pounds, status done."'}
      </div>
      {interim && <div className="voice-interim">{interim}</div>}
    </div>
  );
}
