/**
 * Utility functions for date and time formatting
 */

/**
 * Appends 'Z' to a timestamp if it's missing timezone info,
 * ensuring it's treated as UTC.
 */
export const ensureUTC = (timestamp: string | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.endsWith('Z') || timestamp.includes('+')) return timestamp;
  return `${timestamp}Z`;
};

/**
 * Formats a timestamp into a local 12-hour time (e.g., 10:30 AM)
 */
export const formatToLocalTime = (timestamp: string | null | undefined): string => {
  const date = new Date(ensureUTC(timestamp));
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats a timestamp into a local date string (e.g., 3/8/2026)
 */
export const formatToLocalDate = (timestamp: string | null | undefined): string => {
  const date = new Date(ensureUTC(timestamp));
  return date.toLocaleDateString();
};

/**
 * Checks if a timestamp is "today"
 */
export const isToday = (timestamp: string | null | undefined): boolean => {
  const date = new Date(ensureUTC(timestamp));
  const today = new Date();
  return date.toDateString() === today.toDateString();
};
