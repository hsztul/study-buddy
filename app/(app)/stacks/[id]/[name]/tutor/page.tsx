"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff, BookOpen, Target, TrendingUp, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

interface UserContext {
  reviewed: string[];
  tested: Array<{
    term: string;
    partOfSpeech: string | null;
    lastGrade: string | null;
    lastScore: number | null;
  }>;
  totals: {
    reviewed: number;
    tested: number;
  };
}

export default function StackTutorPage() {
  const router = useRouter();
  const params = useParams();
  const stackId = parseInt(params.id as string);
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);

  // Load context data on mount to show what will be used in the session
  useEffect(() => {
    const loadContext = async () => {
      try {
        const response = await fetch("/api/tutor/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stackId }),
        });

        if (response.ok) {
          const { userContext: context } = await response.json();
          setUserContext(context);
        }
      } catch (error) {
        console.error("Failed to load context:", error);
      }
    };

    loadContext();
  }, [stackId]);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      
      // Get ephemeral token and personalized instructions from our API
      const tokenResponse = await fetch("/api/tutor/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stackId }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get session token");
      }

      const { apiKey, instructions: tutorInstructions, userContext: context } = await tokenResponse.json();
      
      // Store context for display
      setUserContext(context);
      
      console.log("User context:", context);
      console.log("Personalized instructions:", tutorInstructions);
      
      // Create the RealtimeAgent with personalized instructions
      // This follows the pattern from the OpenAI Agents SDK documentation
      const agent = new RealtimeAgent({
        name: "Study Tutor",
        instructions: tutorInstructions,
      });

      // Create a RealtimeSession with the agent
      // The session handles the WebRTC connection, audio processing, and conversation lifecycle
      const session = new RealtimeSession(agent, {
        model: "gpt-realtime-mini",
      });
      sessionRef.current = session;

      // Connect to the session - this will automatically request microphone access
      await session.connect({ apiKey });

      setIsSessionActive(true);
      toast({
        title: "Tutor session started!",
        description: "You can now speak with your AI tutor",
      });
      
    } catch (error) {
      console.error("Failed to start session:", error);
      toast({
        title: "Failed to start tutor session",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
        sessionRef.current = null;
      } catch (error) {
        console.error("Error closing session:", error);
      }
    }
    
    setIsSessionActive(false);
    setTranscript("");
    setResponse("");
    toast({
      title: "Tutor session ended",
      description: "Your voice session has been stopped",
    });
  };

  // Calculate stats from user context
  const passCount = userContext?.tested.filter(t => t.lastGrade === 'pass').length || 0;
  const almostCount = userContext?.tested.filter(t => t.lastGrade === 'almost').length || 0;
  const failCount = userContext?.tested.filter(t => t.lastGrade === 'fail').length || 0;
  const avgScore = userContext?.tested.length 
    ? (userContext.tested.reduce((sum, t) => sum + (t.lastScore || 0), 0) / userContext.tested.length * 100).toFixed(0)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Tutor</h1>
          <p className="text-muted-foreground">
            Practice your learning with an interactive AI tutor using voice
          </p>
        </div>

        {/* Flashcard-style Tutor Session Card */}
        <Card className="border-2 shadow-lg overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Tutor Session</h2>
                  <p className="text-blue-100 text-sm">
                    {isSessionActive 
                      ? "Active - Speak clearly and your tutor will respond" 
                      : "Personalized tutoring based on your progress"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            {userContext && (
              <div className="grid grid-cols-3 gap-3">
                {/* Reviewed */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-white/90" />
                    <span className="text-xs font-medium text-white/90">Reviewed</span>
                  </div>
                  <div className="text-2xl font-bold">{userContext.totals.reviewed}</div>
                  <p className="text-xs text-white/70 mt-0.5">cards studied</p>
                </div>

                {/* Tested */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-white/90" />
                    <span className="text-xs font-medium text-white/90">Tested</span>
                  </div>
                  <div className="text-2xl font-bold">{userContext.totals.tested}</div>
                  <p className="text-xs text-white/70 mt-0.5">attempts</p>
                </div>

                {/* Performance */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-white/90" />
                    <span className="text-xs font-medium text-white/90">Score</span>
                  </div>
                  <div className="text-2xl font-bold">{avgScore}%</div>
                  <div className="flex gap-1.5 mt-0.5 text-xs">
                    <span className="text-green-200">✓{passCount}</span>
                    <span className="text-yellow-200">~{almostCount}</span>
                    <span className="text-red-200">✗{failCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <CardContent className="p-6">
            {/* Session Control */}
            <div className="flex flex-col items-center gap-4">
              {!isSessionActive ? (
                <Button 
                  onClick={startSession} 
                  disabled={isConnecting}
                  size="lg"
                  className="w-full max-w-md h-14 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  {isConnecting ? "Connecting..." : "Start Tutor Session"}
                </Button>
              ) : (
                <>
                  <div className="w-full max-w-md bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-lg">Session Active</span>
                    </div>
                    <p className="text-sm text-green-600 text-center">
                      Your AI tutor is listening and ready to help
                    </p>
                  </div>
                  <Button 
                    onClick={stopSession} 
                    variant="destructive"
                    size="lg"
                    className="w-full max-w-md h-12"
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    End Session
                  </Button>
                </>
              )}

                          </div>
          </CardContent>
        </Card>

        {(transcript || response) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                    {transcript}
                  </div>
                </CardContent>
              </Card>
            )}

            {response && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tutor Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto text-sm whitespace-pre-wrap">
                    {response}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>How to use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Click "Start Tutor Session" to begin</li>
              <li>Allow microphone access when prompted</li>
              <li>Speak clearly about what you want to learn</li>
              <li>Your tutor will respond with helpful guidance</li>
              <li>Click "End Session" when you're done</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
