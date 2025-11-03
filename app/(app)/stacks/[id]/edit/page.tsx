"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Stack {
  id: number;
  name: string;
  isProtected: boolean;
}

interface CardInput {
  id: string;
  term: string;
  definition: string;
  isExisting?: boolean;
  existingId?: number;
}

export default function EditStackPage() {
  const router = useRouter();
  const params = useParams();
  const stackId = params.id as string;
  const { toast } = useToast();
  const [stack, setStack] = useState<Stack | null>(null);
  const [stackName, setStackName] = useState("");
  const [cards, setCards] = useState<CardInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchStackAndCards();
  }, [stackId]);

  const fetchStackAndCards = async () => {
    try {
      setFetching(true);
      
      // Fetch stack
      const stackResponse = await fetch(`/api/stacks/${stackId}`);
      if (!stackResponse.ok) {
        if (stackResponse.status === 404) {
          toast({
            title: "Error",
            description: "Stack not found",
            variant: "destructive",
          });
          router.push("/stacks");
          return;
        }
        throw new Error("Failed to fetch stack");
      }
      const stackData = await stackResponse.json();
      setStack(stackData.stack);
      setStackName(stackData.stack.name);

      // Fetch cards
      const cardsResponse = await fetch(`/api/stacks/${stackId}/cards?limit=100`);
      if (!cardsResponse.ok) {
        throw new Error("Failed to fetch cards");
      }
      const cardsData = await cardsResponse.json();
      
      const cardInputs: CardInput[] = cardsData.cards.map((card: any) => ({
        id: `existing-${card.id}`,
        term: card.term,
        definition: card.definition,
        isExisting: true,
        existingId: card.id,
      }));
      
      setCards(cardInputs.length > 0 ? cardInputs : [{ id: "1", term: "", definition: "" }]);
    } catch (error) {
      console.error("Error fetching stack and cards:", error);
      toast({
        title: "Error",
        description: "Failed to load stack",
        variant: "destructive",
      });
      router.push("/stacks");
    } finally {
      setFetching(false);
    }
  };

  const addCard = () => {
    const newId = (Math.max(...cards.map((c) => parseInt(c.id.replace('existing-', '')))) + 1).toString();
    setCards([...cards, { id: newId, term: "", definition: "" }]);
    
    // Scroll to the bottom after adding a new card
    setTimeout(() => {
      const newCardElement = document.getElementById(`card-${newId}`);
      if (newCardElement) {
        newCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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

    if (!stack) return;

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
      // Update stack name if changed
      if (stackName.trim() !== stack.name) {
        const stackResponse = await fetch(`/api/stacks/${stackId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: stackName.trim() }),
        });

        if (!stackResponse.ok) {
          const error = await stackResponse.json();
          if (stackResponse.status === 403) {
            throw new Error("Cannot edit protected stack");
          }
          throw new Error(error.error || "Failed to update stack");
        }

        const { stack: updatedStack } = await stackResponse.json();
        setStack(updatedStack);
      }

      // Process cards
      const cardPromises = [];

      // Update existing cards
      for (const card of cards.filter(c => c.isExisting && c.existingId)) {
        if (card.term.trim() || card.definition.trim()) {
          cardPromises.push(
            fetch(`/api/stacks/${stackId}/cards/${card.existingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                term: card.term.trim(),
                definition: card.definition.trim(),
              }),
            })
          );
        }
      }

      // Create new cards
      for (const card of cards.filter(c => !c.isExisting)) {
        if (card.term.trim() && card.definition.trim()) {
          cardPromises.push(
            fetch(`/api/stacks/${stackId}/cards`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                term: card.term.trim(),
                definition: card.definition.trim(),
              }),
            })
          );
        }
      }

      await Promise.all(cardPromises);

      toast({
        title: "Success",
        description: "Stack updated successfully",
      });

      // Redirect back to the stack view
      const urlName = stackName.trim().toLowerCase().replace(/\s+/g, '-');
      router.push(`/stacks/${stack.id}/${urlName}/review`);
    } catch (error: any) {
      console.error("Error updating stack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update stack",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold mb-4">Stack not found</h2>
          <Button onClick={() => router.push("/stacks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stacks
          </Button>
        </div>
      </div>
    );
  }

  if (stack.isProtected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold mb-4">Cannot Edit Protected Stack</h2>
          <p className="text-muted-foreground mb-4 text-center">
            This stack is protected and cannot be edited.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold">Edit Stack</h1>
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
              <div key={card.id} id={`card-${card.id}`} className="border rounded-lg p-4 space-y-3">
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
            
            {/* Add New Card Area */}
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div>
                  <h3 className="font-medium mb-1">Add New Card</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a new flashcard for this stack
                  </p>
                  <Button type="button" variant="default" onClick={addCard}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Card
                  </Button>
                </div>
              </div>
            </div>
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
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
