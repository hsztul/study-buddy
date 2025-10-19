import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Brain, TrendingUp, Sparkles, Zap, Target, CheckCircle2, Clock, Award } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Mobile-First PWA • Voice-Powered Learning
          </Badge>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Talk your way to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SAT vocab mastery
            </span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl md:text-2xl max-w-3xl mx-auto">
            Review with flashcards, then <strong>speak</strong> definitions to your StudyBuddy—and get instant, 
            friendly feedback powered by AI. Master 384 SAT words the fun way.
          </p>
          
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-base px-8 py-6 text-lg">
                <Zap className="mr-2 h-5 w-5" />
                Start Learning Free
              </Button>
            </SignUpButton>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 text-lg" asChild>
              <a href="#how-it-works">
                See How It Works
              </a>
            </Button>
          </div>
          
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>384 SAT words included</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/50 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Everything you need to ace SAT vocab
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              A smarter, more engaging way to learn vocabulary—designed for mobile-first studying.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1: Voice Testing */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Voice Testing</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Speak definitions naturally—our AI transcribes with Whisper and grades your responses in real-time using GPT-4.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            {/* Feature 2: Smart Repetition */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Smart Repetition</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Adaptive spaced repetition ensures you review words exactly when you need to—no wasted time, maximum retention.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            {/* Feature 3: Track Progress */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-green-200 dark:hover:border-green-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Track Progress</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    See your accuracy, streaks, and mastery stats—stay motivated with clear, actionable insights into your learning.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            {/* Feature 4: Instant Feedback */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Instant Feedback</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Get Pass/Almost/Fail grades with helpful tips and mnemonics to remember what you missed—learn from every attempt.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            {/* Feature 5: Flashcard Review */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-cyan-200 dark:hover:border-cyan-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Flashcard Review</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Browse, flip, and swipe through 384 SAT words. Mark the ones you want to test yourself on and build your custom queue.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            {/* Feature 6: Mobile-First PWA */}
            <Card className="border-2 transition-all hover:shadow-lg hover:border-pink-200 dark:hover:border-pink-800">
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg">
                  <Award className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Mobile-First PWA</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Install on your phone for a native app experience. Study anywhere, anytime—optimized for portrait mode and touch.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              Simple & Effective
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Three simple steps to vocabulary mastery
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-4xl space-y-12">
            <div className="flex gap-6 sm:gap-8 items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-bold">Review with flashcards</h3>
                <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                  Browse 384 SAT words with beautiful flashcards. Flip to see definitions, examples, and synonyms. 
                  Mark the ones you want to test yourself on with a simple checkbox—build your personalized test queue.
                </p>
              </div>
            </div>

            <div className="flex gap-6 sm:gap-8 items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-bold">Speak the definition</h3>
                <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                  Enter Test Mode and see a word. Tap the mic button and speak the definition in your own words. 
                  Our AI transcribes your voice using OpenAI's Whisper—the most accurate speech recognition available.
                </p>
              </div>
            </div>

            <div className="flex gap-6 sm:gap-8 items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-bold">Get instant feedback</h3>
                <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                  Receive a grade (Pass/Almost/Fail) in seconds with helpful tips and mnemonics to remember what you missed. 
                  Words are automatically scheduled for review using smart spaced repetition—study less, remember more.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-base px-8 py-6">
                <Sparkles className="mr-2 h-5 w-5" />
                Try It Free Now
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 py-20 sm:py-28">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Start in less than 60 seconds
            </Badge>
            
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Ready to master{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SAT vocabulary?
              </span>
            </h2>
            
            <p className="mt-6 text-xl text-muted-foreground sm:text-2xl">
              Join students who are learning smarter with voice-powered practice. 
              No downloads, no setup—just sign in and start talking.
            </p>
            
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="text-lg px-10 py-7 shadow-lg">
                  <Zap className="mr-2 h-6 w-6" />
                  Start Learning Free
                </Button>
              </SignUpButton>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>384 SAT words</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Works on any device</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
