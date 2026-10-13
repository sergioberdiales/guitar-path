import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachPlacement, catalogEntries, continuation, lastSessionKey, progressSummary, rememberSession, resolveSession, sessionHref, sessionNeighbors } from '../src/course.js';
import { createProgressExport, emptyProgress, loadProgress, storageKey } from '../src/progress.js';
import { catalog, entries, root, sessions } from './helpers/course.js';

test('raíz y sesión desconocida muestran el índice; todos los enlaces conservan la base de Pages', () => {
  assert.equal(resolveSession(sessions), null);
  assert.equal(resolveSession(sessions, '?session=unknown'), null);
  assert.equal(resolveSession([], '?session=unknown'), null);
  for (const session of sessions) {
    const url = new URL(sessionHref(session.id, '/guitar-path/'), 'https://example.org');
    assert.equal(url.pathname, '/guitar-path/');
    assert.equal(resolveSession(sessions, url.search), session);
  }
});

test('el catálogo contiene un bloque y tres semanas de dos sesiones sin huecos', () => {
  assert.equal(catalog.blocks.length, 1);
  assert.deepEqual(catalog.blocks[0].weeks.map(({ number, title, sessions }) => [number, title, sessions.length]), [
    [1, 'Notas e intervalos', 2], [2, 'Tríadas en el mástil', 2], [3, 'Aplicación musical y voz', 2],
  ]);
  assert.deepEqual(sessions.map(({ week }) => week.number), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual(sessions.map(({ number }) => number), [1, 2, 3, 4, 5, 6]);
  const invalid = structuredClone(catalog);
  invalid.blocks[0].weeks[0].sessions.pop();
  assert.throws(() => catalogEntries(invalid));
  assert.throws(() => attachPlacement(entries[0], sessions[1]));
});

test('la ubicación pedagógica no depende de IDs, rutas ni metadatos antiguos', () => {
  const content = JSON.parse(readFileSync(new URL(entries[4].file, root)));
  const placed = attachPlacement({ ...entries[4], file: 'anywhere.json' }, { ...content, week: { number: 99 } });
  assert.equal(placed.id, 'block-01-week-01-session-05');
  assert.equal(placed.week.number, 3);
});

test('anterior y siguiente cruzan semanas, sin envolver los extremos', () => {
  assert.equal(sessionNeighbors(sessions, sessions[0].id).previous, null);
  assert.equal(sessionNeighbors(sessions, sessions[1].id).next, sessions[2]);
  assert.equal(sessionNeighbors(sessions, sessions[4].id).previous, sessions[3]);
  assert.equal(sessionNeighbors(sessions, sessions[5].id).next, null);
});

test('estado agregado deriva solo de ejercicios y distingue práctica de comodidad', () => {
  const progress = emptyProgress(sessions[0]);
  progress.note = 'Nota'; progress.actualDuration = 20;
  assert.equal(progressSummary(progress).state, 'pending');
  progress.exercises[sessions[0].exercises[0].id] = 'comfortable';
  assert.equal(progressSummary(progress).state, 'started');
  for (const id of Object.keys(progress.exercises)) progress.exercises[id] = 'practiced';
  assert.equal(progressSummary(progress).state, 'practiced');
  for (const id of Object.keys(progress.exercises)) progress.exercises[id] = 'comfortable';
  assert.equal(progressSummary(progress).state, 'comfortable');
});

test('registros históricos se leen y exportan con semanas actuales sin modificar un byte', () => {
  const values = new Map(sessions.map((session) => {
    const progress = emptyProgress(session);
    progress.exercises[session.exercises[0].id] = 'comfortable';
    progress.actualDuration = 50; progress.note = 'Anterior\n🎸';
    return [storageKey(session.id), JSON.stringify(progress, null, 4)];
  }));
  const before = [...values];
  const getStorage = () => ({ getItem: (key) => values.get(key) ?? null });
  for (const session of sessions) {
    assert.equal(loadProgress(session, getStorage).progress.actualDuration, 50);
    assert.equal(loadProgress(session, getStorage).progress.exercises[session.exercises[0].id], 'comfortable');
  }
  assert.deepEqual(createProgressExport(sessions, getStorage).sessions.map(({ week }) => week.number), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual([...values], before);
});

test('continuación usa última visita válida o progreso previo; tolera almacenamiento bloqueado', () => {
  const records = Object.fromEntries(sessions.map((session) => [session.id, { progress: emptyProgress(session), error: null }]));
  const values = new Map();
  const getStorage = () => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
  assert.equal(continuation(sessions, records, getStorage), sessions[0]);
  records[sessions[2].id].progress.exercises[sessions[2].exercises[0].id] = 'practiced';
  assert.equal(continuation(sessions, records, getStorage), sessions[2]);
  rememberSession(sessions[4].id, getStorage);
  assert.deepEqual([...values.keys()], [lastSessionKey]);
  assert.equal(continuation(sessions, records, getStorage), sessions[4]);
  rememberSession('unknown', getStorage);
  assert.equal(continuation(sessions, records, getStorage), sessions[2]);
  const blocked = () => { throw new Error('SecurityError'); };
  assert.doesNotThrow(() => rememberSession(sessions[0].id, blocked));
  assert.equal(continuation(sessions, records, blocked), sessions[2]);
  for (const record of Object.values(records)) for (const id of Object.keys(record.progress.exercises)) record.progress.exercises[id] = 'comfortable';
  assert.equal(continuation(sessions, records, blocked), sessions[0]);
});
