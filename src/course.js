// Pedagogical placement comes only from the catalog, never from historical IDs/paths.
export function catalogEntries(catalog) {
  if (catalog.schemaVersion !== 1 || !catalog.blocks?.length) throw new Error('Invalid course catalog');
  const entries = catalog.blocks.flatMap(({ weeks, ...block }) => weeks.flatMap(({ sessions, ...week }) => {
    if (sessions.length !== 2) throw new Error('Each week needs two sessions');
    return sessions.map((entry) => ({ ...entry, block, week }));
  }));
  if (!entries.length || new Set(entries.map(({ id }) => id)).size !== entries.length) {
    throw new Error('Invalid session IDs');
  }
  return entries;
}

export function attachPlacement(entry, content) {
  if (entry.id !== content.id) throw new Error('Session ID does not match catalog');
  return { ...content, block: entry.block, week: entry.week };
}

export function resolveSession(sessions, search = '') {
  const requestedId = new URLSearchParams(search).get('session');
  return sessions.find(({ id }) => id === requestedId) ?? null;
}

export function sessionHref(sessionId, basePath = '/') {
  return `${basePath}?session=${encodeURIComponent(sessionId)}`;
}

export function sessionNeighbors(sessions, sessionId) {
  const index = sessions.findIndex(({ id }) => id === sessionId);
  return { previous: index > 0 ? sessions[index - 1] : null, next: index >= 0 ? sessions[index + 1] ?? null : null };
}

export function progressSummary(progress) {
  const states = Object.values(progress.exercises);
  const practiced = states.filter((state) => state !== 'pending').length;
  const total = states.length;
  const state = !practiced ? 'pending' : practiced < total ? 'started' : states.every((value) => value === 'comfortable') ? 'comfortable' : 'practiced';
  const label = { pending: 'Pendiente', started: 'En curso', practiced: 'Practicada', comfortable: 'Cómoda' }[state];
  return { state, label, practiced, total };
}

export const lastSessionKey = 'guitar-path:last-session:v1';

export function continuation(sessions, records, getStorage = () => window.localStorage) {
  let lastId;
  try { lastId = getStorage().getItem(lastSessionKey); } catch { /* Progress still provides a fallback. */ }
  return sessions.find(({ id }) => id === lastId)
    ?? sessions.find(({ id }) => !records[id].error && progressSummary(records[id].progress).state === 'started')
    ?? sessions.find(({ id }) => !records[id].error && progressSummary(records[id].progress).state === 'pending')
    ?? sessions[0];
}

export function rememberSession(id, getStorage = () => window.localStorage) {
  try { getStorage().setItem(lastSessionKey, id); } catch { /* Optional navigation preference. */ }
}
