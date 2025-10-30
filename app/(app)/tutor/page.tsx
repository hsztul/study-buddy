"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

export default function TutorPage() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const sessionRef = useRef<RealtimeSession | null>(null);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      
      // Get ephemeral token and personalized instructions from our API
      const tokenResponse = await fetch("/api/tutor/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get session token");
      }

      const { apiKey, instructions, userContext } = await tokenResponse.json();
      
      console.log("User context:", userContext);
      console.log("Personalized instructions:", instructions);
      
      // Create the RealtimeAgent with personalized instructions
      // This follows the pattern from the OpenAI Agents SDK documentation
      const agent = new RealtimeAgent({
        name: "Study Tutor",
        instructions: instructions,
      });

      // Create a RealtimeSession with the agent
      // The session handles the WebRTC connection, audio processing, and conversation lifecycle
      const session = new RealtimeSession(agent, {
        model: "gpt-realtime",
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Tutor</h1>
          <p className="text-muted-foreground">
            Practice your learning with an interactive AI tutor using voice
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Session
            </CardTitle>
            <CardDescription>
              {isSessionActive 
                ? "Your tutor is ready to help you learn!" 
                : "Click start to begin a voice session with your AI tutor"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {!isSessionActive ? (
                <Button 
                  onClick={startSession} 
                  disabled={isConnecting}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isConnecting ? "Connecting..." : "Start Tutor Session"}
                </Button>
              ) : (
                <Button 
                  onClick={stopSession} 
                  variant="destructive"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>

            {isSessionActive && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Session Active</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Speak clearly and your tutor will respond
                </p>
              </div>
            )}
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
