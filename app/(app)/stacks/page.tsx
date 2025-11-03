"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Clock, TrendingUp, Shield, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Stack {
  id: number;
  name: string;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  reviewedCount: number;
  dueCount: number;
  lastStudied: string | null;
}

export default function MyStacksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStacks();
  }, []);

  const fetchStacks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stacks");
      if (!response.ok) throw new Error("Failed to fetch stacks");
      const data = await response.json();
      setStacks(data.stacks);
    } catch (error) {
      console.error("Error fetching stacks:", error);
      toast({
        title: "Error",
        description: "Failed to load card stacks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStack = async (stackId: number, stackName: string) => {
    if (!confirm(`Are you sure you want to delete "${stackName}"? This will delete all cards in the stack.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/stacks/${stackId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete stack");
      }

      toast({
        title: "Success",
        description: "Stack deleted successfully",
      });

      fetchStacks();
    } catch (error: any) {
      console.error("Error deleting stack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete stack",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getStackUrlName = (stackName: string) => {
    return stackName.toLowerCase().replace(/\s+/g, '-');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-3xl font-bold">My Card Stacks</h1>
          <p className="text-muted-foreground mt-1">
            Organize your study materials into custom card stacks
          </p>
        </div>
      </div>

      {/* Stacks Grid */}
      {stacks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No card stacks yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first card stack to start studying
            </p>
            <Button onClick={() => router.push("/stacks/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Stack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Stack Card */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer border-dashed border-2 border-muted-foreground/20 hover:border-primary/50 group min-h-[280px] flex flex-col"
            onClick={() => router.push("/stacks/new")}
          >
            <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create New Stack</h3>
              <p className="text-muted-foreground text-sm">
                Start a new card stack to organize your study materials
              </p>
            </CardContent>
          </Card>
          
          {stacks.map((stack) => (
            <Card
              key={stack.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => router.push(`/stacks/${stack.id}/${getStackUrlName(stack.name)}/review`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {stack.name}
                      {stack.isProtected && (
                        <Badge variant="secondary" className="text-xs" title="Locked Stack">
                          <Lock className="w-3 h-3" />
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  {!stack.isProtected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStack(stack.id, stack.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                    <BookOpen className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="font-semibold">{stack.cardCount}</span>
                    <span className="text-xs text-muted-foreground">Cards</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                    <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="font-semibold">{stack.reviewedCount}</span>
                    <span className="text-xs text-muted-foreground">Reviewed</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                    <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="font-semibold">{stack.dueCount}</span>
                    <span className="text-xs text-muted-foreground">Due</span>
                  </div>
                </div>

                {/* Last Studied */}
                <div className="text-xs text-muted-foreground">
                  Last studied: {formatDate(stack.lastStudied)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/stacks/${stack.id}/${getStackUrlName(stack.name)}/review`);
                    }}
                  >
                    Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/stacks/${stack.id}/${getStackUrlName(stack.name)}/test`);
                    }}
                  >
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
