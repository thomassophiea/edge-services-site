import { Lock, Unlock, X } from 'lucide-react';
import { Button } from '../ui/button';

interface TimelineControlsProps {
  currentTime: number | null;
  isLocked: boolean;
  hasTimeWindow: boolean;
  onToggleLock: () => void;
  onClearTimeWindow: () => void;
}

export function TimelineControls({
  currentTime,
  isLocked,
  hasTimeWindow,
  onToggleLock,
  onClearTimeWindow,
}: TimelineControlsProps) {
  const formatTimestamp = (timestamp: number | null): string => {
    if (timestamp === null) return 'No time selected';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Timeline: </span>
          <span className="font-medium">{formatTimestamp(currentTime)}</span>
        </div>

        <Button
          variant={isLocked ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleLock}
          disabled={currentTime === null}
          className="gap-2"
        >
          {isLocked ? (
            <>
              <Lock className="h-4 w-4" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              Unlocked
            </>
          )}
        </Button>
      </div>

      {hasTimeWindow && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearTimeWindow}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear Selection
        </Button>
      )}
    </div>
  );
}
