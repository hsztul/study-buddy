"use client";

import { Mic, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MicPermissionExplainerProps {
  onContinue: () => void;
}

export function MicPermissionExplainer({ onContinue }: MicPermissionExplainerProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <Mic className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <h2 className="mb-4 text-center text-2xl font-bold">
          Test Mode Needs Your Microphone
        </h2>

        <p className="mb-6 text-center text-muted-foreground">
          You'll speak definitions, and we'll transcribe and grade them. Your microphone is
          essential for this feature to work.
        </p>

        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-green-100 p-2">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Real-time Transcription</h3>
              <p className="text-sm text-muted-foreground">
                We use Whisper AI to convert your speech to text instantly
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-purple-100 p-2">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                Audio is only recorded locally during your session and sent for transcription.
                We don't store audio files.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>What happens next:</strong> Your browser will ask for microphone permission.
            Click "Allow" to continue to Test Mode.
          </p>
        </div>

        <Button onClick={onContinue} size="lg" className="w-full">
          Continue
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can change this permission anytime in your browser settings
        </p>
      </Card>
    </div>
  );
}
