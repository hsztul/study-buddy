"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Word {
  id: number;
  term: string;
}

interface WordSearchProps {
  allWords: Word[];
  onWordSelect: (wordId: number) => void;
}

export function WordSearch({ allWords, onWordSelect }: WordSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter words based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = allWords
        .filter((word) => word.term.toLowerCase().includes(query))
        .slice(0, 10); // Limit to 10 results
      setFilteredWords(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredWords([]);
    }
  }, [searchQuery, allWords]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredWords.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filteredWords.length > 0) {
        e.preventDefault();
        handleSelectWord(filteredWords[selectedIndex]);
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredWords, selectedIndex]);

  const handleSelectWord = (word: Word) => {
    onWordSelect(word.id);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
    setFilteredWords([]);
    setSelectedIndex(0);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="shrink-0"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search words..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-4"
        />
        
        {/* Dropdown with filtered results */}
        {filteredWords.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover shadow-lg"
          >
            {filteredWords.map((word, index) => (
              <button
                key={word.id}
                onClick={() => handleSelectWord(word)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors",
                  index === selectedIndex && "bg-accent"
                )}
              >
                {word.term}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
