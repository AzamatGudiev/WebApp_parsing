import { format as formatDateFns, isValid } from 'date-fns';

export function formatTimestamp(timestamp: { seconds: number; nanoseconds: number } | string | Date | undefined | null): string {
  if (!timestamp) {
    return 'N/A';
  }

  let date: Date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'object' && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  } else {
    return 'Invalid Date';
  }

  if (!isValid(date)) {
    return 'Invalid Date';
  }
  
  return formatDateFns(date, 'MMM d, yyyy, h:mm a');
}
