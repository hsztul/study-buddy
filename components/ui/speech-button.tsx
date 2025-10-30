"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Volume2Icon, Loader2 } from "lucide-react";
import { speakWord, type SpeechOptions } from "@/lib/speech";
import { cn } from "@/lib/utils";

interface SpeechButtonProps {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  title?: string; // Allow custom title for definition speech
}

export function SpeechButton({
  text,
  voice = 'alloy',
  speed = 1.0,
  className,
  size = "sm",
  variant = "ghost",
  title,
}: SpeechButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling to parent elements
    
    if (isPlaying || !text.trim()) return;

    setIsPlaying(true);
    setError(null);

    try {
      await speakWord(text, { voice, speed });
    } catch (error) {
      console.error('Speech button error:', error);
      setError('Speech failed');
      // Auto-clear error after 2 seconds
      setTimeout(() => setError(null), 2000);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <Button
      onClick={handleSpeak}
      disabled={isPlaying || !text.trim()}
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        isPlaying && "scale-95",
        error && "text-destructive hover:text-destructive",
        className
      )}
      title={error || (isPlaying ? "Speaking..." : title || "Pronounce word")}
    >
      {isPlaying ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
