export const exerciseStates = {
  pending: 'Pendiente',
  practiced: 'Practicado',
  comfortable: 'Cómodo',
};

export function storageKey(sessionId) {
  return `guitar-path:progress:v1:${sessionId}`;
}

export function emptyProgress(session) {
  return {
    exercises: Object.fromEntries(session.exercises.map(({ id }) => [id, 'pending'])),
    actualDuration: null,
    note: '',
  };
}

export function normalizeProgress(value, session) {
  const progress = emptyProgress(session);
  if (!value || typeof value !== 'object') return progress;

  for (const id of Object.keys(progress.exercises)) {
    const state = value.exercises?.[id];
    if (Object.hasOwn(exerciseStates, state)) progress.exercises[id] = state;
  }
  if (Number.isInteger(value.actualDuration) && value.actualDuration > 0) {
    progress.actualDuration = value.actualDuration;
  }
  if (typeof value.note === 'string') progress.note = value.note;
  return progress;
}

// Access localStorage inside try/catch: browsers may also throw on the getter.
export function loadProgress(session, getStorage = () => window.localStorage) {
  try {
    const raw = getStorage().getItem(storageKey(session.id));
    return {
      progress: normalizeProgress(raw === null ? null : JSON.parse(raw), session),
      error: null,
    };
  } catch {
    return {
      progress: emptyProgress(session),
      error: 'No se ha podido recuperar el progreso local. Puedes practicar, pero los datos anteriores no están disponibles.',
    };
  }
}

export function saveProgress(session, progress, getStorage = () => window.localStorage) {
  try {
    getStorage().setItem(storageKey(session.id), JSON.stringify(normalizeProgress(progress, session)));
    return { error: null };
  } catch {
    return { error: 'No se ha podido guardar. Los cambios se conservan solo mientras esta página siga abierta. Revisa el almacenamiento de tu navegador.' };
  }
}

// Read only known session keys; never enumerate or write browser storage.
// Let read/parse errors reach the caller instead of exporting a false empty copy.
export function createProgressExport(sessions, getStorage = () => window.localStorage, exportedAt = new Date()) {
  const storage = getStorage();
  return {
    format: 'guitar-path-progress',
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    sessions: sessions.flatMap((session) => {
      const raw = storage.getItem(storageKey(session.id));
      if (raw === null) return [];
      return [{
        sessionId: session.id,
        title: session.title,
        block: { number: session.block.number, title: session.block.title },
        week: { number: session.week.number, title: session.week.title },
        sessionNumber: session.number,
        progress: normalizeProgress(JSON.parse(raw), session),
      }];
    }),
  };
}
