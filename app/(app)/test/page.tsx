"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MicPermissionExplainer } from "@/components/test/mic-permission-explainer";
import { MicPermissionDenied } from "@/components/test/mic-permission-denied";
import { TestFlashcard, Grade } from "@/components/test/test-flashcard";
import { SessionFooter } from "@/components/test/session-footer";
import { LandscapeSidebar } from "@/components/layout/landscape-sidebar";
import { Spinner } from "@/components/ui/spinner";
import { AudioRecorder } from "@/lib/audio-recorder";

type PermissionState = "unknown" | "prompt" | "granted" | "denied";
type TestState = "permission" | "loading" | "testing" | "complete";

interface Word {
  id: number;
  term: string;
}

interface AttemptResult {
  grade: Grade;
  transcript: string;
  feedback?: string;
  score?: number;
}

export default function TestPage() {
  const router = useRouter();
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [testState, setTestState] = useState<TestState>("permission");
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState<{ wordId: number; grade: Grade }[]>([]);

  // Check mic permission on mount
  useEffect(() => {
    checkMicPermission();
  }, []);

  const checkMicPermission = async () => {
    const permission = await AudioRecorder.checkPermission();
    console.log("[Test] Initial permission check:", permission);
    setPermissionState(permission);

    if (permission === "granted") {
      loadWords();
    } else {
      // Show permission explainer for "prompt" or stay on denied screen
      setTestState("permission");
    }
  };

  const handleContinue = async () => {
    console.log("[Test] User clicked continue, requesting mic access...");
    
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[Test] getUserMedia not supported");
      alert("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Safari, or Firefox.");
      return;
    }
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Test] Microphone access granted!");
      
      // Clean up the stream immediately
      stream.getTracks().forEach((track) => track.stop());
      
      setPermissionState("granted");
      setTestState("loading");
      loadWords();
    } catch (error: any) {
      console.error("[Test] Microphone access denied:", error);
      console.error("[Test] Error name:", error.name);
      console.error("[Test] Error message:", error.message);
      setPermissionState("denied");
      setTestState("permission");
    }
  };

  const handleRetry = () => {
    checkMicPermission();
  };

  const loadWords = async () => {
    setTestState("loading");
    try {
      // Fetch words from the test queue API (will be implemented in 0.10)
      // For now, use a placeholder
      const response = await fetch("/api/test/next?limit=20");
      if (response.ok) {
        const data = await response.json();
        setWords(data.words || []);
        setTestState(data.words?.length > 0 ? "testing" : "complete");
      } else {
        // Fallback: fetch any words
        const fallbackResponse = await fetch("/api/words?limit=20");
        const fallbackData = await fallbackResponse.json();
        setWords(fallbackData.words || []);
        setTestState(fallbackData.words?.length > 0 ? "testing" : "complete");
      }
    } catch (error) {
      console.error("Failed to load words:", error);
      setTestState("complete");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (isProcessing || currentIndex >= words.length) return;

    setIsProcessing(true);
    const currentWord = words[currentIndex];

    try {
      // Send audio to API for transcription and grading
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("wordId", currentWord.id.toString());

      const response = await fetch("/api/test/attempt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process attempt");
      }

      const data = await response.json();
      setResult({
        grade: data.grade,
        transcript: data.transcript,
        feedback: data.feedback,
        score: data.score,
      });

      setAttempts([...attempts, { wordId: currentWord.id, grade: data.grade }]);
    } catch (error) {
      console.error("Failed to process recording:", error);
      alert("Failed to process your recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setResult(null);
      setTestState("testing");
      setIsProcessing(false);
    } else {
      setTestState("complete");
    }
  };

  const handleRetryWord = () => {
    setResult(null);
    setTestState("testing");
    setIsProcessing(false);
  };

  const handleEndSession = () => {
    router.push("/profile");
  };

  const calculateAccuracy = () => {
    if (attempts.length === 0) return undefined;
    const passes = attempts.filter((a) => a.grade === "pass").length;
    return passes / attempts.length;
  };

  // Render permission states
  if (testState === "permission") {
    console.log("[Test] Rendering permission screen, state:", permissionState);
    if (permissionState === "denied") {
      return <MicPermissionDenied onRetry={handleRetry} />;
    }
    return <MicPermissionExplainer onContinue={handleContinue} />;
  }

  // Render loading state
  if (testState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your test words...</p>
        </div>
      </div>
    );
  }

  // Render complete state
  if (testState === "complete") {
    return (
      <div className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold mb-4">Session Complete!</h1>
          <p className="text-muted-foreground mb-8">
            {attempts.length > 0
              ? `You completed ${attempts.length} word${attempts.length > 1 ? "s" : ""} with ${Math.round((calculateAccuracy() || 0) * 100)}% accuracy.`
              : "No words available in your test queue. Add some words from Review Mode!"}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/review")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Review
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              View Stats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <>
      {/* Desktop and Portrait Mobile Layout */}
      <div className="flex min-h-screen flex-col landscape:hidden landscape:md:flex">
        <div className="flex-1 container px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <TestFlashcard
              word={currentWord?.term || ""}
              onRecordingComplete={handleRecordingComplete}
              disabled={isProcessing}
              isProcessing={isProcessing}
              result={result}
              onNext={handleNext}
              onRetry={handleRetryWord}
            />
          </div>
        </div>

        {/* Footer */}
        <SessionFooter
          currentIndex={currentIndex}
          totalWords={words.length}
          accuracy={calculateAccuracy()}
          onEndSession={handleEndSession}
        />
      </div>

      {/* Landscape Mobile ONLY Layout - Fullscreen */}
      <div className="fixed inset-0 hidden landscape:flex landscape:md:hidden">
        <LandscapeSidebar />
        <div className="ml-16 flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <TestFlashcard
                word={currentWord?.term || ""}
                onRecordingComplete={handleRecordingComplete}
                disabled={isProcessing}
                isProcessing={isProcessing}
                result={result}
                onNext={handleNext}
                onRetry={handleRetryWord}
              />
            </div>
          </div>

          {/* Footer - compact in landscape */}
          <div className="border-t bg-background p-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {currentIndex + 1} / {words.length}
              </span>
              {calculateAccuracy() !== undefined && (
                <span className="text-muted-foreground">
                  {Math.round((calculateAccuracy() || 0) * 100)}% accuracy
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
