"use client";

import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Brain, TrendingUp } from "lucide-react";

export function LandingContent() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Talk your way to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SAT vocab mastery
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Review with flashcards, then <strong>speak</strong> definitions to your StudyBuddy—and get instant, 
            friendly feedback powered by AI.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-base">
                Get Started Free
              </Button>
            </SignUpButton>
            <Button size="lg" variant="outline" className="text-base" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/50 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to ace SAT vocab
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A smarter, more engaging way to learn vocabulary—designed for mobile-first studying.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1: Voice Testing */}
            <Card className="border-2 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Mic className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Voice Testing</CardTitle>
                <CardDescription>
                  Speak definitions naturally—our AI transcribes and grades your responses in real-time.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2: Smart Repetition */}
            <Card className="border-2 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Smart Repetition</CardTitle>
                <CardDescription>
                  Adaptive spaced repetition ensures you review words exactly when you need to—no wasted time.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3: Track Progress */}
            <Card className="border-2 transition-all hover:shadow-lg sm:col-span-2 lg:col-span-1">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>
                  See your accuracy, streaks, and mastery stats—stay motivated with clear, actionable insights.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to vocabulary mastery
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl space-y-8">
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold">Review with flashcards</h3>
                <p className="mt-2 text-muted-foreground">
                  Browse 384 SAT words, flip cards to see definitions, and mark the ones you want to test yourself on.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold">Speak the definition</h3>
                <p className="mt-2 text-muted-foreground">
                  Enter Test Mode and speak the definition when prompted. Our AI transcribes your voice using Whisper.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600 dark:bg-green-900 dark:text-green-400">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold">Get instant feedback</h3>
                <p className="mt-2 text-muted-foreground">
                  Receive a grade (Pass/Almost/Fail) with helpful tips and mnemonics. Words are scheduled for review based on your performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to master SAT vocabulary?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join students who are learning smarter with voice-powered practice.
            </p>
            <div className="mt-10">
              <SignUpButton mode="modal">
                <Button size="lg" className="text-base">
                  Start Learning Now
                </Button>
              </SignUpButton>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to use • No credit card required • 384 SAT words included
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
