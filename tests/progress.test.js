import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyProgress, loadProgress, normalizeProgress, saveProgress, storageKey } from '../src/progress.js';

const session = JSON.parse(readFileSync(new URL('../public/content/course/block-01/week-01/session-01.json', import.meta.url), 'utf8'));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('una primera visita deja todos los ejercicios pendientes y el cierre vacío', () => {
  const { progress, error } = loadProgress(session, memoryStorage);
  assert.equal(error, null);
  assert.deepEqual(Object.values(progress.exercises), Array(session.exercises.length).fill('pending'));
  assert.equal(progress.actualDuration, null);
  assert.equal(progress.note, '');
});

test('recupera los tres estados, duración y nota sin perder caracteres ni saltos de línea', () => {
  const storage = memoryStorage();
  const progress = emptyProgress(session);
  progress.exercises[session.exercises[0].id] = 'comfortable';
  progress.exercises[session.exercises[1].id] = 'practiced';
  progress.actualDuration = 28;
  progress.note = 'B ↔ B♭: lo escucho.\nF♯ → F; <practicar> & repetir.';
  assert.equal(saveProgress(session, progress, () => storage).error, null);
  assert.deepEqual(loadProgress(session, () => storage).progress, progress);
});

test('permite volver a pendiente y vaciar los campos guardados', () => {
  const storage = memoryStorage();
  const progress = emptyProgress(session);
  progress.exercises[session.exercises[0].id] = 'practiced';
  progress.actualDuration = 30;
  progress.note = 'Nota temporal';
  saveProgress(session, progress, () => storage);
  saveProgress(session, emptyProgress(session), () => storage);
  assert.deepEqual(loadProgress(session, () => storage).progress, emptyProgress(session));
});

test('los datos corruptos no bloquean la práctica ni se sobrescriben al cargar', () => {
  const storage = memoryStorage();
  storage.setItem(storageKey(session.id), '{invalid json');
  const { progress, error } = loadProgress(session, () => storage);
  assert.ok(error);
  assert.deepEqual(progress, emptyProgress(session));
  assert.equal(storage.getItem(storageKey(session.id)), '{invalid json');
});

test('recupera solo los estados válidos de ejercicios que siguen en el contenido', () => {
  const [first, second, third] = session.exercises;
  const progress = normalizeProgress({
    exercises: { [first.id]: 'comfortable', [second.id]: 'mastered', [third.id]: 'toString', removed: 'practiced' },
    actualDuration: -1,
    note: 123,
  }, session);
  assert.equal(progress.exercises[first.id], 'comfortable');
  assert.equal(progress.exercises[second.id], 'pending');
  assert.equal(progress.exercises[third.id], 'pending');
  assert.equal(Object.hasOwn(progress.exercises, 'removed'), false);
  assert.equal(progress.actualDuration, null);
  assert.equal(progress.note, '');
});

test('ignora duraciones no enteras, cero y valores de tipo incorrecto', () => {
  for (const actualDuration of [0, -5, 2.5, '30', null, Infinity, NaN]) {
    assert.equal(normalizeProgress({ actualDuration }, session).actualDuration, null);
  }
});

test('avisa cuando el navegador bloquea el acceso al almacenamiento', () => {
  const blocked = () => { throw new Error('SecurityError'); };
  assert.ok(loadProgress(session, blocked).error);
  assert.ok(saveProgress(session, emptyProgress(session), blocked).error);
});

test('un fallo de cuota avisa sin modificar el progreso que permanece en memoria', () => {
  const progress = emptyProgress(session);
  progress.note = 'Esta nota todavía no está guardada';
  const storage = { setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.ok(saveProgress(session, progress, () => storage).error);
  assert.equal(progress.note, 'Esta nota todavía no está guardada');
});

test('las sesiones guardan en claves distintas sin afectar otros datos del navegador', () => {
  const storage = memoryStorage();
  storage.setItem('other-app', 'untouched');
  const otherSession = { ...session, id: 'another-session' };
  const progress = emptyProgress(session);
  progress.note = 'Solo en la sesión original';
  saveProgress(session, progress, () => storage);
  assert.equal(loadProgress(otherSession, () => storage).progress.note, '');
  assert.equal(storage.getItem('other-app'), 'untouched');
});
