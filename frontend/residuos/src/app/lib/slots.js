// app/lib/slots.js
export function buildDaySlots(date) {
  const even = date.getDate() % 2 === 0;
  const start = even ? 8 : 9;   // hora inicial
  const end   = even ? 16 : 19; // hora final
  const step  = even ? 60 : 90; // minutos entre turnos

  const slots = [];
  for (let h = start, m = 0; h < end || (h === end && m === 0); ) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    slots.push({ time: `${hh}:${mm}`, available: true });
    m += step;
    while (m >= 60) { h += 1; m -= 60; }
  }

  return {
    date: date.toISOString().slice(0, 10),
    slots
  };
}
