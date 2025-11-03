"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Mic, MessageSquare, BarChart3, Shield, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Stack {
  id: number;
  name: string;
  isProtected: boolean;
}

export default function StackLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const stackId = params.id as string;
  const stackName = params.name as string;
  const [stack, setStack] = useState<Stack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidName, setIsValidName] = useState(false);
  const isLoadingRef = useRef(false);

  const fetchStack = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple fetches
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      const response = await fetch(`/api/stacks/${stackId}`);
      if (!response.ok) throw new Error("Failed to fetch stack");
      const data = await response.json();
      setStack(data.stack);
      
      // Check if the name in URL matches the stack name (lowercase with hyphens)
      const expectedName = data.stack.name.toLowerCase().replace(/\s+/g, '-');
      setIsValidName(expectedName === stackName);
    } catch (error) {
      console.error("Error fetching stack:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [stackId, stackName]);

  useEffect(() => {
    fetchStack();
  }, [stackId, fetchStack]); // Include fetchStack in dependencies

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
                onClick={() => router.push("/stacks")}
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
              
              {/* Edit Button */}
              {!stack.isProtected && (
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
                  onClick={() => router.push("/stacks")}
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
              
              {/* Edit Button */}
              {!stack.isProtected && (
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
