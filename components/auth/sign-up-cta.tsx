"use client";

import { Mic, MessageSquare, BarChart3, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

interface SignUpCTAProps {
  mode: "test" | "tutor" | "stats";
  onBack?: () => void;
}

export default function SignUpCTA({ mode, onBack }: SignUpCTAProps) {
  const getModeContent = () => {
    switch (mode) {
      case "test":
        return {
          icon: Mic,
          title: "Test Mode",
          description: "Put your knowledge to the test with voice-powered learning",
          features: [
            "Speak definitions and get instant AI feedback",
            "Track your accuracy and improve over time",
            "Smart spaced repetition scheduling",
            "Personalized tips and mnemonics"
          ],
          color: "text-red-600",
          bgColor: "bg-red-50"
        };
      case "tutor":
        return {
          icon: MessageSquare,
          title: "Tutor Mode",
          description: "Get personalized help from your AI study buddy",
          features: [
            "Chat with an AI tutor about any concept",
            "Get detailed explanations and examples",
            "Ask follow-up questions for deeper understanding",
            "Learn at your own pace"
          ],
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        };
      case "stats":
        return {
          icon: BarChart3,
          title: "Stats Mode",
          description: "Track your progress and optimize your study sessions",
          features: [
            "Detailed performance analytics",
            "Track cards reviewed, tested, and mastered",
            "Identify areas that need more practice",
            "Monitor your study streaks and consistency"
          ],
          color: "text-green-600",
          bgColor: "bg-green-50"
        };
    }
  };

  const content = getModeContent();
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-6">
          <div className={`w-16 h-16 ${content.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${content.color}`} />
          </div>
          <CardTitle className="text-2xl font-bold mb-2">
            {content.title} Requires Sign Up
          </CardTitle>
          <p className="text-muted-foreground">
            {content.description}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Features List */}
          <div className="space-y-3">
            {content.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                </div>
                <p className="text-sm text-muted-foreground">{feature}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <SignUpButton mode="modal">
              <Button className="w-full" size="lg">
                Sign Up Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </SignUpButton>
            
            <SignInButton mode="modal">
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </SignInButton>
          </div>

          {/* Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Back to Review Mode
            </Button>
          )}

          {/* Trust Indicators */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Free forever • No credit card required</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
