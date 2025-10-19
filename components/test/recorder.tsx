"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder, RecorderState } from "@/lib/audio-recorder";

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function Recorder({ onRecordingComplete, disabled }: RecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize recorder
    const recorder = new AudioRecorder({
      onStateChange: setRecorderState,
      onError: (error) => {
        console.error("Recorder error:", error);
        alert("Recording error: " + error.message);
      },
    });

    recorderRef.current = recorder;

    return () => {
      recorder.cleanup();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!recorderRef.current || disabled) return;

    try {
      // Initialize if not already done
      if (recorderRef.current.getState() === "idle") {
        await recorderRef.current.initialize();
      }

      recorderRef.current.start();
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || recorderState !== "recording") return;

    try {
      const audioBlob = await recorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      onRecordingComplete(audioBlob);
      setDuration(0);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isRecording = recorderState === "recording";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Visual feedback */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <div className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
      )}

      {/* Record button */}
      <div className="relative">
        {isRecording ? (
          <Button
            onClick={stopRecording}
            size="lg"
            variant="destructive"
            className="h-20 w-20 rounded-full"
            disabled={disabled}
          >
            <Square className="h-8 w-8" />
          </Button>
        ) : (
          <Button
            onClick={startRecording}
            size="lg"
            className="h-20 w-20 rounded-full"
            disabled={disabled}
          >
            <Mic className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground">
        {isRecording ? (
          <>
            <strong>Recording...</strong> Tap to stop
          </>
        ) : (
          <>Tap to start recording</>
        )}
      </p>
    </div>
  );
}
