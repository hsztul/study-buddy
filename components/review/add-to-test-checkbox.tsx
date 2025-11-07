"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignUpButton } from "@clerk/nextjs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddToTestCheckboxProps {
  wordId: number;
  stackId?: number;
  initialChecked: boolean;
  onToggle?: (wordId: number, checked: boolean) => void;
}

export function AddToTestCheckbox({
  wordId,
  stackId,
  initialChecked,
  onToggle,
}: AddToTestCheckboxProps) {
  const { isSignedIn } = useAuth();
  const [checked, setChecked] = useState(initialChecked);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Sync state when initialChecked or wordId changes (navigating between cards)
  useEffect(() => {
    setChecked(initialChecked);
  }, [initialChecked, wordId]);

  const handleToggle = async (newChecked: boolean) => {
    // Show sign-up modal for non-authenticated users
    if (!isSignedIn) {
      setShowSignUpModal(true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/review/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cardId: wordId, 
          stackId: stackId || 1, // Default to SAT stack if not provided
          add: newChecked 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update test queue");
      }

      setChecked(newChecked);
      onToggle?.(wordId, newChecked);
    } catch (error) {
      console.error("Error toggling test queue:", error);
      // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-x-3 rounded-lg border p-3 bg-muted/30">
        <Label
          htmlFor={`test-queue-${wordId}`}
          className="text-sm font-medium cursor-pointer flex-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </span>
          ) : checked ? (
            <span className="text-green-600 dark:text-green-400">Added to test stack</span>
          ) : (
            "Add to test stack"
          )}
        </Label>
        <Switch
          id={`test-queue-${wordId}`}
          checked={checked}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>

      {/* Sign-up Modal */}
      <Dialog open={showSignUpModal} onOpenChange={setShowSignUpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Up to Start Testing</DialogTitle>
            <DialogDescription>
              Create a free account to add cards to your test queue and track your progress with voice-powered testing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Mode Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Speak definitions and get instant AI feedback</li>
                <li>Smart spaced repetition scheduling</li>
                <li>Track your accuracy and improve over time</li>
                <li>Personalized tips and mnemonics</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <SignUpButton mode="modal">
                <Button className="w-full">
                  Sign Up Free
                </Button>
              </SignUpButton>
              <Button
                variant="outline"
                onClick={() => setShowSignUpModal(false)}
                className="w-full"
              >
                Continue Reviewing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
