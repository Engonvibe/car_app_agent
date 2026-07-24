import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { MicIcon } from "./Icons";

interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
}

export default function VoiceCapture({ onTranscript }: VoiceCaptureProps) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState(
    'Tap the mic and speak. Example: "Oil change for Ford Focus on 12 May 2024, amount 120 pounds, status done."'
  );

  async function safeStopSpeech() {
    try {
      await Promise.race([
        SpeechRecognition.stop(),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
    } catch {
      // Ignore stop errors.
    }
  }

  async function startNativeSpeech() {
    if (listening) return;

    try {
      setListening(true);
      setMessage("Checking microphone...");

      const available = await SpeechRecognition.available();

      if (!available.available) {
        setMessage("Speech recognition is not available on this device.");
        return;
      }

      const permissionStatus = await SpeechRecognition.checkPermissions();

      if (permissionStatus.speechRecognition !== "granted") {
        const permissionRequest = await SpeechRecognition.requestPermissions();

        if (permissionRequest.speechRecognition !== "granted") {
          setMessage("Microphone permission is required for voice input.");
          return;
        }
      }

      setMessage("Listening... Speak now.");

      const result = await SpeechRecognition.start({
        language: "en-GB",
        maxResults: 1,
        partialResults: false,
        popup: true,
        prompt: "Speak your service entry",
      });

      const transcript = result.matches?.[0]?.trim();

      if (transcript) {
        onTranscript(transcript);
        setMessage(`Heard: ${transcript}`);
      } else {
        setMessage("No voice captured. Please try again.");
      }
    } catch (error) {
      console.error("Native speech recognition error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Voice capture failed. Please try again."
      );
    } finally {
      setListening(false);
      await safeStopSpeech();
    }
  }

  function startBrowserSpeech() {
    if (listening) return;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SR();

    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setMessage("Listening... Speak now.");

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();

      if (transcript) {
        onTranscript(transcript);
        setMessage(`Heard: ${transcript}`);
      } else {
        setMessage("No voice captured. Please try again.");
      }
    };

    recognition.onerror = () => {
      setMessage("Voice capture failed. Please try again.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  function handleMicClick() {
    if (Capacitor.isNativePlatform()) {
      startNativeSpeech();
    } else {
      startBrowserSpeech();
    }
  }

  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        safeStopSpeech();
      }
    };
  }, []);

  return (
    <div className="voice-box">
      <button
        type="button"
        className={`mic-btn ${listening ? "listening" : ""}`}
        onClick={handleMicClick}
        disabled={listening}
        aria-label="Start voice input"
      >
        <MicIcon size={24} />
      </button>

      <div className="field-hint">{message}</div>
    </div>
  );
}