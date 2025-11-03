"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, BookOpen, TrendingUp, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Card {
  id: number;
  term: string;
  definition: string;
  hasReviewed?: boolean | null;
  inTestQueue?: boolean | null;
  streak?: number | null;
  lastResult?: string | null;
}

export default function StackStatsPage() {
  const params = useParams();
  const stackId = params.id as string;
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, [stackId]);

  const fetchCards = async () => {
    try {
      const response = await fetch(`/api/stacks/${stackId}/cards?limit=500`);
      if (!response.ok) throw new Error("Failed to fetch cards");
      const data = await response.json();
      setCards(data.cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalCards = cards.length;
  const reviewedCards = cards.filter((c) => c.hasReviewed).length;
  const inQueue = cards.filter((c) => c.inTestQueue).length;
  const mastered = cards.filter((c) => c.lastResult === "pass").length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Total Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedCards}</div>
            <p className="text-xs text-muted-foreground">
              {totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              In Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inQueue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Mastered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mastered}</div>
            <p className="text-xs text-muted-foreground">
              {totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card List */}
      <Card>
        <CardHeader>
          <CardTitle>All Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No cards in this stack yet.
            </p>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{card.term}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {card.definition}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {card.hasReviewed && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Reviewed
                      </span>
                    )}
                    {card.inTestQueue && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                        Queued
                      </span>
                    )}
                    {card.lastResult === "pass" && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        Mastered
                      </span>
                    )}
                    {card.streak && card.streak > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        🔥 {card.streak}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
