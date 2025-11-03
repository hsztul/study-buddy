"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CardInput {
  id: string;
  term: string;
  definition: string;
}

export default function CreateStackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stackName, setStackName] = useState("");
  const [cards, setCards] = useState<CardInput[]>([
    { id: "1", term: "", definition: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addCard = () => {
    const newId = (Math.max(...cards.map((c) => parseInt(c.id))) + 1).toString();
    setCards([...cards, { id: newId, term: "", definition: "" }]);
  };

  const removeCard = (id: string) => {
    if (cards.length === 1) {
      toast({
        title: "Error",
        description: "You must have at least one card",
        variant: "destructive",
      });
      return;
    }
    setCards(cards.filter((c) => c.id !== id));
  };

  const updateCard = (id: string, field: "term" | "definition", value: string) => {
    setCards(
      cards.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!stackName.trim()) {
      toast({
        title: "Error",
        description: "Stack name is required",
        variant: "destructive",
      });
      return;
    }

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length === 0) {
      toast({
        title: "Error",
        description: "At least one card with term and definition is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create stack
      const stackResponse = await fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stackName.trim() }),
      });

      if (!stackResponse.ok) {
        const error = await stackResponse.json();
        throw new Error(error.error || "Failed to create stack");
      }

      const { stack } = await stackResponse.json();

      // Create cards
      const cardPromises = validCards.map((card) =>
        fetch(`/api/stacks/${stack.id}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            term: card.term.trim(),
            definition: card.definition.trim(),
          }),
        })
      );

      await Promise.all(cardPromises);

      toast({
        title: "Success",
        description: `Stack "${stackName}" created with ${validCards.length} cards`,
      });

      router.push(`/stacks/${stack.id}/review`);
    } catch (error: any) {
      console.error("Error creating stack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create stack",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Create New Stack</h1>
        </div>

        {/* Stack Name */}
        <Card>
          <CardHeader>
            <CardTitle>Stack Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="stackName">Stack Name *</Label>
              <Input
                id="stackName"
                placeholder="e.g., Spanish Vocabulary, Biology Terms"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-muted-foreground">
                {stackName.length}/100 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cards</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addCard}>
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cards.map((card, index) => (
              <div key={card.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Card {index + 1}</span>
                  {cards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCard(card.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`term-${card.id}`}>Term (Front) *</Label>
                  <Input
                    id={`term-${card.id}`}
                    placeholder="e.g., Photosynthesis"
                    value={card.term}
                    onChange={(e) => updateCard(card.id, "term", e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`definition-${card.id}`}>
                    Definition (Back) *
                  </Label>
                  <Textarea
                    id={`definition-${card.id}`}
                    placeholder="e.g., The process by which plants convert light energy into chemical energy"
                    value={card.definition}
                    onChange={(e) =>
                      updateCard(card.id, "definition", e.target.value)
                    }
                    maxLength={1000}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Stack"}
          </Button>
        </div>
      </form>
    </div>
  );
}
