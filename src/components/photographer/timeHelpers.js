// Helper for 12-hour AM/PM time formatting (e.g., "8:00 AM" or "5:00 PM")
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.slice(0, 5).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// Compact 12-hour AM/PM formatting for calendar chips & tight badges (e.g., "8 AM" or "8:30 AM")
export function formatTime12Compact(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.slice(0, 5).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m === '00' ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}
