"use client";

import { AlertCircle, Chrome, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MicPermissionDeniedProps {
  onRetry: () => void;
}

export function MicPermissionDenied({ onRetry }: MicPermissionDeniedProps) {
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("chrome") || userAgent.includes("edge")) {
      return {
        browser: "Chrome/Edge",
        icon: Chrome,
        steps: [
          "Click the lock icon in the address bar",
          "Find 'Microphone' in the permissions list",
          "Change it to 'Allow'",
          "Refresh the page",
        ],
      };
    } else if (userAgent.includes("safari")) {
      return {
        browser: "Safari",
        icon: Globe,
        steps: [
          "Go to Safari > Settings for This Website",
          "Find 'Microphone' in the list",
          "Change it to 'Allow'",
          "Refresh the page",
        ],
      };
    } else if (userAgent.includes("firefox")) {
      return {
        browser: "Firefox",
        icon: Globe,
        steps: [
          "Click the microphone icon in the address bar",
          "Select 'Allow' from the dropdown",
          "Click 'Remember this decision'",
          "Refresh the page",
        ],
      };
    }

    return {
      browser: "Your Browser",
      icon: Globe,
      steps: [
        "Look for a microphone icon in your address bar",
        "Click it and select 'Allow'",
        "Refresh the page",
      ],
    };
  };

  const instructions = getBrowserInstructions();
  const Icon = instructions.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h2 className="mb-4 text-center text-2xl font-bold">
          Microphone Access Denied
        </h2>

        <p className="mb-6 text-center text-muted-foreground">
          Test Mode requires microphone access to transcribe your spoken definitions.
          Without it, you can still use Review Mode to study with flashcards.
        </p>

        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon className="h-5 w-5 text-yellow-700" />
            <h3 className="font-semibold text-yellow-900">
              How to Enable in {instructions.browser}
            </h3>
          </div>
          <ol className="space-y-2 text-sm text-yellow-900">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onRetry} variant="default" className="flex-1">
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/review")}
            variant="outline"
            className="flex-1"
          >
            Go to Review Mode
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Still having trouble? Check your system settings to ensure microphone access is enabled
          for your browser.
        </p>
      </Card>
    </div>
  );
}
