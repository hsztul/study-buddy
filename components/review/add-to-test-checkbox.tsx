"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddToTestCheckboxProps {
  wordId: number;
  initialChecked: boolean;
  onToggle?: (checked: boolean) => void;
}

export function AddToTestCheckbox({
  wordId,
  initialChecked,
  onToggle,
}: AddToTestCheckboxProps) {
  const [checked, setChecked] = useState(initialChecked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (newChecked: boolean) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/review/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, add: newChecked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update test queue");
      }

      setChecked(newChecked);
      onToggle?.(newChecked);
    } catch (error) {
      console.error("Error toggling test queue:", error);
      // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`test-queue-${wordId}`}
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label
        htmlFor={`test-queue-${wordId}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating...
          </span>
        ) : (
          "Add to Test Queue"
        )}
      </Label>
    </div>
  );
}
