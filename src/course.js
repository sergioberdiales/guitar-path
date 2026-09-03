export function resolveSession(sessions, search = '') {
  const requestedId = new URLSearchParams(search).get('session');
  return sessions.find(({ id }) => id === requestedId) ?? sessions[0] ?? null;
}

export function sessionHref(sessionId, basePath = '/') {
  return `${basePath}?session=${encodeURIComponent(sessionId)}`;
}
