"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, ArrowUpDown, Trash2, CheckCircle, XCircle, Clock, BookOpen, List, Grid3X3, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface MyCard {
  id: number;
  term: string;
  partOfSpeech?: string | null;
  hasReviewed: boolean;
  firstReviewedAt?: string | null;
  lastReviewedAt?: string | null;
  lastResult?: string | null;
  streak: number;
  inTestQueue: boolean;
  attemptCount: number;
  correctAttempts: number;
  lastAttemptAt?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Flashcard component for flashcard view
function MyFlashcard({ card, onRemove }: { card: MyCard; onRemove: (wordId: number) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFlip = async () => {
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);

    // Fetch definition when flipping to back
    if (newFlipState && !definition && !isLoading) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/words/${card.id}/definition`);
        if (response.ok) {
          const data = await response.json();
          if (data.definitions && data.definitions.length > 0) {
            setDefinition(data.definitions[0].definition);
          }
        }
      } catch (error) {
        console.error("Error fetching definition:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusBadge = () => {
    if (card.attemptCount > 0) {
      const accuracy = card.correctAttempts / card.attemptCount;
      if (accuracy >= 0.8) {
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Strong</Badge>;
      } else if (accuracy >= 0.5) {
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Learning</Badge>;
      } else {
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Needs Work</Badge>;
      }
    }
    return <Badge className="border-blue-200 text-blue-700"><BookOpen className="w-3 h-3 mr-1" />Reviewed</Badge>;
  };

  return (
    <div className="relative">
      <div className="perspective-1000 w-full h-[350px]">
        <Card
          className={`absolute inset-0 cursor-pointer transition-transform duration-500 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          onClick={handleFlip}
        >
          {/* Front Side */}
          <CardContent className="absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-2xl font-bold text-center">{card.term}</h3>
            </div>
            {card.partOfSpeech && (
              <p className="text-sm text-muted-foreground italic mb-4">
                {card.partOfSpeech}
              </p>
            )}
            <div className="flex flex-col items-center gap-2">
              {getStatusBadge()}
              <p className="text-xs text-muted-foreground">
                {card.attemptCount} attempts • {card.streak} streak
              </p>
            </div>
            <p className="mt-auto text-sm text-muted-foreground">
              Tap to see definition
            </p>
          </CardContent>

          {/* Back Side */}
          <CardContent className={`absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden rotate-y-180 ${
            !isFlipped ? "invisible" : ""
          }`}>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading definition...</p>
              </div>
            ) : definition ? (
              <div className="space-y-4 text-center">
                <p className="text-base leading-relaxed">{definition}</p>
                <div className="flex flex-col items-center gap-2">
                  {getStatusBadge()}
                  <p className="text-xs text-muted-foreground">
                    {card.correctAttempts}/{card.attemptCount} correct
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tap to flip back
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No definition available</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between items-center mt-4 px-2">
        <div className="text-xs text-muted-foreground">
          Last reviewed: {card.lastReviewedAt ? new Date(card.lastReviewedAt).toLocaleDateString() : "Never"}
        </div>
        {card.hasReviewed && card.attemptCount === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(card.id);
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function MyCardsPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [cards, setCards] = useState<MyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recently-reviewed");
  const [viewMode, setViewMode] = useState<"list" | "flashcards">("list");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchCards = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        filter,
        sort,
        page: page.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/my-cards?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cards");

      const data = await response.json();
      setCards(data.cards);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching cards:", error);
      toast({
        title: "Error",
        description: "Failed to load cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [search, filter, sort]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilter = (value: string) => {
    setFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (value: string) => {
    setSort(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRemoveCard = async (wordId: number) => {
    try {
      const response = await fetch(`/api/my-cards/${wordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove card");
      }

      setCards(cards.filter(card => card.id !== wordId));
      toast({
        title: "Success",
        description: "Card removed from your reviewed list",
      });
    } catch (error: any) {
      console.error("Error removing card:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove card",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (card: MyCard) => {
    if (card.attemptCount > 0) {
      const accuracy = card.correctAttempts / card.attemptCount;
      if (accuracy >= 0.8) {
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Strong</Badge>;
      } else if (accuracy >= 0.5) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Learning</Badge>;
      } else {
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Needs Work</Badge>;
      }
    }
    
    if (card.hasReviewed) {
      return <Badge variant="outline" className="border-blue-200 text-blue-700"><BookOpen className="w-3 h-3 mr-1" />Reviewed</Badge>;
    }
    
    return <Badge variant="outline">New</Badge>;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && cards.length === 0) {
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
      <div className="hidden sm:block space-y-2">
        <p className="text-muted-foreground">
          Review and manage the cards you've studied and tested.
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        {/* Mobile Toggle Header */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            className="w-full justify-between h-auto p-4"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Search & Filters</span>
              {(search || filter !== "all" || sort !== "recently-reviewed") && (
                <Badge variant="secondary" className="ml-2">Active</Badge>
              )}
            </div>
            {isFiltersOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Filters Content */}
        <CardHeader className={isFiltersOpen ? "block" : "hidden sm:block"}>
          {/* Desktop - Always visible */}
          <div className="hidden sm:flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search cards..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter */}
            <Select value={filter} onValueChange={handleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                <SelectItem value="reviewed">Reviewed Only</SelectItem>
                <SelectItem value="tested">Tested Only</SelectItem>
                <SelectItem value="correct">Correct Only</SelectItem>
                <SelectItem value="incorrect">Incorrect Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sort} onValueChange={handleSort}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recently-reviewed">Recently Reviewed</SelectItem>
                <SelectItem value="recently-tested">Recently Tested</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="accuracy">Accuracy</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "flashcards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("flashcards")}
                className="h-8 px-3"
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>

          {/* Mobile - Collapsible */}
          <div className="sm:hidden space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search cards..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter and Sort Row */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={filter} onValueChange={handleFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="tested">Tested</SelectItem>
                  <SelectItem value="correct">Correct</SelectItem>
                  <SelectItem value="incorrect">Incorrect</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={handleSort}>
                <SelectTrigger>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recently-reviewed">Recent</SelectItem>
                  <SelectItem value="recently-tested">Tested</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex-1 h-8"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "flashcards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("flashcards")}
                className="flex-1 h-8"
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards List */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cards found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search ? "Try adjusting your search or filters." : "Start reviewing cards to see them here."}
            </p>
            <Button asChild>
              <a href="/review">Start Reviewing</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {cards.map((card) => (
                <Card key={card.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{card.term}</h3>
                          {getStatusBadge(card)}
                        </div>
                        
                        {card.partOfSpeech && (
                          <p className="text-sm text-muted-foreground italic">
                            {card.partOfSpeech}
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Reviewed:</span>
                            <p className="font-medium">{formatDate(card.lastReviewedAt)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Attempts:</span>
                            <p className="font-medium">{card.attemptCount}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Accuracy:</span>
                            <p className="font-medium">
                              {card.attemptCount > 0 
                                ? `${Math.round((card.correctAttempts / card.attemptCount) * 100)}%`
                                : "N/A"
                              }
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Streak:</span>
                            <p className="font-medium">{card.streak} 🔥</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {card.hasReviewed && card.attemptCount === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCard(card.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/review?wordId=${card.id}`}>Review</a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Flashcard View */}
          {viewMode === "flashcards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => (
                <MyFlashcard 
                  key={card.id} 
                  card={card} 
                  onRemove={handleRemoveCard}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => fetchCards(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchCards(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyCardsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <MyCardsPageContent />
    </Suspense>
  );
}
