interface TestProgressStripProps {
  masteredCount: number;
  totalWords: number;
  correctCount: number;
  testedCount: number;
}

export function TestProgressStrip({
  masteredCount,
  totalWords,
  correctCount,
  testedCount,
}: TestProgressStripProps) {
  const masteredPercentage = totalWords > 0 ? (masteredCount / totalWords) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
          style={{ width: `${masteredPercentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {masteredCount} of {totalWords} mastered
        </span>
        <span className="font-medium text-foreground">
          {correctCount} of {testedCount} correct
        </span>
      </div>
    </div>
  );
}
