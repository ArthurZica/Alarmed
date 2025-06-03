function parseHorario(input) {
  const str = input.trim().toLowerCase().replace(/\s+/g, '');

  const match = str.match(/^(\d{1,2})(:(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const minute = match[3] ? parseInt(match[3]) : 0;
  const period = match[4];

  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

module.exports = { parseHorario };