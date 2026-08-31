import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgressExport, emptyProgress, storageKey } from '../src/progress.js';

const session = JSON.parse(readFileSync(new URL('../public/content/course/block-01/week-01/session-01.json', import.meta.url), 'utf8'));
const exportedAt = new Date('2026-08-31T14:00:00.000Z');

function readOnlyStorage(entries = []) {
  const values = new Map(entries);
  const reads = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem() { assert.fail('Exportar no debe escribir en localStorage'); },
    removeItem() { assert.fail('Exportar no debe borrar claves de localStorage'); },
    clear() { assert.fail('Exportar no debe vaciar localStorage'); },
  };
  return { values, reads, getStorage: () => storage };
}

function savedProgress() {
  const progress = emptyProgress(session);
  progress.exercises['listen-major-minor'] = 'comfortable';
  progress.exercises['unpack-known-chord'] = 'practiced';
  progress.actualDuration = 28;
  progress.note = 'Me costó localizar la tercera.';
  return progress;
}

function storageWithProgress(progress = savedProgress()) {
  return readOnlyStorage([[storageKey(session.id), JSON.stringify(progress)]]);
}

test('la exportación identifica su formato, versión y fecha UTC', () => {
  const { getStorage } = storageWithProgress();
  const data = createProgressExport([session], getStorage, exportedAt);
  assert.equal(data.format, 'guitar-path-progress');
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.exportedAt, '2026-08-31T14:00:00.000Z');
});

test('conserva el ID estable y los metadatos de sesión, bloque y semana', () => {
  const { getStorage } = storageWithProgress();
  const data = createProgressExport([session], getStorage, exportedAt);
  assert.equal(data.sessions.length, 1);
  const { progress, ...metadata } = data.sessions[0];
  assert.deepEqual(metadata, {
    sessionId: 'block-01-week-01-session-01',
    title: 'Del acorde conocido a 1–3–5',
    block: { number: 1, title: 'Entender el mástil' },
    week: { number: 1, title: 'Notas e intervalos' },
    sessionNumber: 1,
  });
});

test('conserva los tres estados, duración y nota del registro guardado', () => {
  const progress = savedProgress();
  const { getStorage } = storageWithProgress(progress);
  const data = createProgressExport([session], getStorage, exportedAt);
  assert.deepEqual(data.sessions[0].progress, progress);
});

test('JSON conserva caracteres especiales, comillas, barras y saltos de línea', () => {
  const progress = savedProgress();
  progress.note = 'G → B♭: «cómodo» 🎸\nF♯ → F\r\n<nota> & "repetir" \\ seguir.';
  const { getStorage } = storageWithProgress(progress);
  const json = JSON.stringify(createProgressExport([session], getStorage, exportedAt), null, 2);
  assert.equal(JSON.parse(json).sessions[0].progress.note, progress.note);
});

test('solo lee las claves exactas de las sesiones conocidas de Guitar Path', () => {
  const progress = savedProgress();
  const { getStorage, reads } = readOnlyStorage([
    [storageKey(session.id), JSON.stringify(progress)],
    ['other-app', 'private data'],
    ['auth-token', 'not for export'],
    ['guitar-path:preferences', '{"theme":"dark"}'],
    [storageKey('unknown-session'), '{"note":"not a supported session"}'],
  ]);
  const data = createProgressExport([session], getStorage, exportedAt);
  assert.deepEqual(reads, [storageKey(session.id)]);
  assert.equal(data.sessions.length, 1);
  assert.deepEqual(data.sessions[0].progress, progress);
  assert.doesNotMatch(JSON.stringify(data), /private data|auth-token|not for export|preferences|unknown-session/);
});

test('exportar no modifica ningún registro ni los metadatos originales', () => {
  const raw = JSON.stringify(savedProgress(), null, 4);
  const { values, getStorage } = readOnlyStorage([
    [storageKey(session.id), raw],
    ['other-app', 'unchanged'],
  ]);
  const before = [...values];
  const data = createProgressExport([session], getStorage, exportedAt);
  data.sessions[0].progress.note = 'Cambio solo en la copia';
  data.sessions[0].block.title = 'Cambio solo en la copia';
  data.sessions[0].week.title = 'Cambio solo en la copia';
  assert.deepEqual([...values], before);
  assert.equal(session.block.title, 'Entender el mástil');
  assert.equal(session.week.title, 'Notas e intervalos');
});

test('sin progreso guardado exporta una lista vacía sin crear un registro', () => {
  const { values, getStorage } = readOnlyStorage();
  const data = createProgressExport([session], getStorage, exportedAt);
  assert.deepEqual(data.sessions, []);
  assert.equal(values.size, 0);
});

test('un registro guardado con campos vacíos conserva null y la nota vacía', () => {
  const progress = emptyProgress(session);
  const { getStorage } = storageWithProgress(progress);
  assert.deepEqual(createProgressExport([session], getStorage, exportedAt).sessions[0].progress, progress);
});

test('normaliza estados y campos inválidos sin corregir el registro en disco', () => {
  const progress = savedProgress();
  progress.exercises['listen-major-minor'] = 'mastered';
  progress.exercises.removed = 'comfortable';
  progress.actualDuration = -1;
  progress.extraField = 'do not include';
  const raw = JSON.stringify(progress);
  const { getStorage, values } = readOnlyStorage([[storageKey(session.id), raw]]);
  const result = createProgressExport([session], getStorage, exportedAt).sessions[0].progress;
  assert.equal(result.exercises['listen-major-minor'], 'pending');
  assert.equal(Object.hasOwn(result.exercises, 'removed'), false);
  assert.equal(Object.hasOwn(result, 'extraField'), false);
  assert.equal(result.actualDuration, null);
  assert.equal(values.get(storageKey(session.id)), raw);
});

test('vuelve a leer el progreso almacenado en cada exportación', () => {
  const { values, getStorage } = storageWithProgress();
  const first = createProgressExport([session], getStorage, exportedAt);
  const edited = { ...savedProgress(), note: 'La nota más reciente', actualDuration: 32 };
  values.set(storageKey(session.id), JSON.stringify(edited));
  const second = createProgressExport([session], getStorage, exportedAt);
  assert.notEqual(first.sessions[0].progress.note, second.sessions[0].progress.note);
  assert.deepEqual(second.sessions[0].progress, edited);
});

test('JSON corrupto o almacenamiento bloqueado impiden una exportación engañosa', () => {
  const { getStorage, values } = readOnlyStorage([[storageKey(session.id), '{broken json']]);
  assert.throws(() => createProgressExport([session], getStorage, exportedAt), SyntaxError);
  assert.equal(values.get(storageKey(session.id)), '{broken json');
  assert.throws(() => createProgressExport([session], () => { throw new Error('SecurityError'); }), /SecurityError/);
  assert.throws(() => createProgressExport([session], () => ({ getItem() { throw new Error('ReadError'); } })), /ReadError/);
});
