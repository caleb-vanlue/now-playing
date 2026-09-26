import { useNow } from "../hooks/useNow";
import { getTimeAgo } from "../../utils/dateUtils";

interface TimeAgoProps {
  date: Date;
  className?: string;
}

// Relative time label that refreshes itself instead of relying on parent re-renders
export function TimeAgo({ date, className }: TimeAgoProps) {
  const now = useNow(30_000);
  return (
    <time dateTime={date.toISOString()} className={className}>
      {now === 0 ? "" : getTimeAgo(date, now)}
    </time>
  );
}
