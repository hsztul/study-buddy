interface ProgressStripProps {
  current: number;
  total: number;
  inQueue: number;
}

export function ProgressStrip({ current, total, inQueue }: ProgressStripProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {current} of {total} mastered
        </span>
        <span className="font-medium text-foreground">
          {inQueue} in test queue
        </span>
      </div>
    </div>
  );
}
