"use client";

import { Card } from "@/components/ui/card";
import { Recorder } from "./recorder";

interface TestCardProps {
  word: string;
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function TestCard({ word, onRecordingComplete, disabled }: TestCardProps) {
  return (
    <Card className="p-8">
      <div className="space-y-8">
        {/* Word display */}
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Define this word:</p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{word}</h2>
        </div>

        {/* Recorder */}
        <div className="flex justify-center">
          <Recorder onRecordingComplete={onRecordingComplete} disabled={disabled} />
        </div>
      </div>
    </Card>
  );
}
