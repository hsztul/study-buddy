"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, BookOpen, Mic, MessageSquare, BarChart3, Shield, Edit, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import ShareButton from "@/components/stacks/share-button";

interface Stack {
  id: number;
  name: string;
  isProtected: boolean;
  isOwner?: boolean;
  isPublicView?: boolean;
  isSaved?: boolean;
}

export default function StackLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { toast } = useToast();
  const stackId = params.id as string;
  const stackName = params.name as string;
  const [stack, setStack] = useState<Stack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidName, setIsValidName] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBackNavigation = () => {
    if (isSignedIn) {
      router.push("/stacks");
    } else {
      router.push("/");
    }
  };

  const handleSaveStack = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/stacks/${stackId}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to save stack");
      }

      const data = await response.json();
      
      if (data.alreadySaved) {
        toast({
          title: "Already saved",
          description: "This stack is already in your collection",
        });
      } else {
        toast({
          title: "Stack saved!",
          description: "Added to your collection",
        });
        
        // Update local state
        setStack(prev => prev ? { ...prev, isSaved: true } : null);
      }
    } catch (error) {
      console.error("Error saving stack:", error);
      toast({
        title: "Error",
        description: "Failed to save stack",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchStack = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple fetches
    
    // Wait for Clerk auth to be loaded before fetching
    if (!isLoaded) {
      console.log("[StackLayout] Waiting for auth to load...");
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      const response = await fetch(`/api/stacks/${stackId}`);
      if (!response.ok) throw new Error("Failed to fetch stack");
      const data = await response.json();
      
      // Check if this stack is already saved (if user is signed in and not the owner)
      let isSaved = false;
      if (isSignedIn && !data.stack.isOwner) {
        console.log("[StackLayout] Checking if stack is saved for signed-in user...");
        try {
          const savedResponse = await fetch(`/api/stacks/${stackId}/is-saved`);
          if (savedResponse.ok) {
            const savedData = await savedResponse.json();
            isSaved = savedData.isSaved;
            console.log("[StackLayout] Stack saved status:", isSaved);
          }
        } catch (e) {
          console.error("Error checking if stack is saved:", e);
        }
      } else {
        console.log("[StackLayout] Not checking saved status:", {
          isSignedIn,
          isOwner: data.stack.isOwner
        });
      }
      
      setStack({ ...data.stack, isSaved });
      
      // Check if the name in URL matches the stack name (lowercase with hyphens)
      const expectedName = data.stack.name.toLowerCase().replace(/\s+/g, '-');
      setIsValidName(expectedName === stackName);
    } catch (error) {
      console.error("Error fetching stack:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [stackId, stackName, isSignedIn, isLoaded]);

  useEffect(() => {
    fetchStack();
  }, [fetchStack]); // fetchStack already has all dependencies

  const tabs = [
    { name: "Review", href: `/stacks/${stackId}/${stackName}/review`, icon: BookOpen },
    { name: "Test", href: `/stacks/${stackId}/${stackName}/test`, icon: Mic },
    { name: "Tutor", href: `/stacks/${stackId}/${stackName}/tutor`, icon: MessageSquare },
    { name: "Stats", href: `/stacks/${stackId}/${stackName}/stats`, icon: BarChart3 },
  ];

  const isActiveTab = (href: string) => pathname === href;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stack || !isValidName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Stack not found</h2>
        <Button onClick={() => router.push("/stacks")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Stacks
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Stack Header */}
      <div className="border-b bg-background">
        <div className="container max-w-7xl mx-auto px-6 py-4">
          {/* Desktop Layout - All inline */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              {/* Stack Name */}
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {stack.name}
                {stack.isProtected && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Protected
                  </Badge>
                )}
              </h1>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Share Button */}
                {isClient && (
                  <ShareButton 
                    stackTitle={stack.name}
                    stackUrl={`${window.location.origin}/stacks/${stackId}/${stack.name.toLowerCase().replace(/\s+/g, '-')}/review`}
                  />
                )}
                
                {/* Save Button - Show for non-owners who are signed in */}
                {isSignedIn && !stack.isOwner && !stack.isSaved && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveStack}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Save to My Stacks
                  </Button>
                )}
                
                {/* Saved indicator */}
                {isSignedIn && !stack.isOwner && stack.isSaved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Saved
                  </Button>
                )}
                
                {/* Edit Button - Only show for owners and non-protected stacks */}
                {stack.isOwner && !stack.isProtected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/stacks/${stackId}/edit`)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActiveTab(tab.href);
                return (
                  <Link key={tab.name} href={tab.href}>
                    <Button
                      variant={active ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {tab.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden">
            {/* Top row with back button and stack name */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackNavigation}
                  className="gap-2 p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {stack.name}
                  {stack.isProtected && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                </h1>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Share Button */}
                {isClient && (
                  <ShareButton 
                    stackTitle={stack.name}
                    stackUrl={`${window.location.origin}/stacks/${stackId}/${stack.name.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                )}
                
                {/* Save Button - Show for non-owners who are signed in */}
                {isSignedIn && !stack.isOwner && !stack.isSaved && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveStack}
                    disabled={isSaving}
                    className="gap-1 text-xs"
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Save
                  </Button>
                )}
                
                {/* Saved indicator */}
                {isSignedIn && !stack.isOwner && stack.isSaved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    className="gap-1 text-xs p-2"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                )}
                
                {/* Edit Button - Only show for owners and non-protected stacks */}
                {stack.isOwner && !stack.isProtected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/stacks/${stackId}/edit`)}
                    className="gap-2 p-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Mobile (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActiveTab(tab.href);
            return (
              <Link key={tab.name} href={tab.href}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="w-full flex flex-col gap-1 h-auto py-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{tab.name}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
