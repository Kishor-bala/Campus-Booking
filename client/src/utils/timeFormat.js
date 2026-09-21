/**
 * Utility functions for 12-hour AM/PM time formatting and IST calculations
 */

export const formatTime12h = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatSlotWindow = (startsAt, endsAt) => {
  if (!startsAt || !endsAt) return '';
  const startStr = formatTime12h(startsAt);
  const endStr = formatTime12h(endsAt);
  return `${startStr} - ${endStr} IST`;
};

export const formatDateReadable = (dateInput) => {
  if (!dateInput) return '';
  try {
    const dateStr = String(dateInput);
    // Standard YYYY-MM-DD format
    if (dateStr.length === 10 && dateStr.includes('-') && !dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // ISO timestamp format or Date string
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (err) {
    return String(dateInput);
  }
};
