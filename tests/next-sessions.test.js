import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgressExport, emptyProgress, exerciseStates, loadProgress, saveProgress, storageKey } from '../src/progress.js';

const root = new URL('../public/content/course/block-01/week-01/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
const sessions = catalog.sessions.map((file) => JSON.parse(readFileSync(new URL(file, root), 'utf8')));
const [session4, session5, session6] = sessions.slice(3);

test('las posiciones y funciones de D, C y G se corresponden con la afinación estándar', () => {
  // Independently calculate pitch classes from the open G, B and e strings.
  const openStrings = [7, 11, 4];
  const noteClass = { C: 0, D: 2, E: 4, 'F♯': 6, G: 7, A: 9, B: 11 };
  const rootClass = { D: 2, C: 0, G: 7 };
  const functionIntervals = { 1: 0, 3: 4, 5: 7 };
  const cards = session4.exercises[0].steps[0].examples;
  for (const card of cards) {
    const chord = card.label.split(' · ')[0];
    const pitches = card.value.split('–').map((fret, i) => (openStrings[i] + Number(fret)) % 12);
    const [notes, functions] = card.detail.split(' · ');
    assert.deepEqual(pitches, notes.split('–').map((note) => noteClass[note]));
    assert.deepEqual(pitches.map((pitch) => (pitch - rootClass[chord] + 12) % 12),
      functions.split('–').map((role) => functionIntervals[role]));
    assert.deepEqual([...pitches].sort(), [0, 4, 7].map((interval) => (rootClass[chord] + interval) % 12).sort());
  }
  const reminders = session4.introduction.examples.map(({ value }) => value);
  assert.deepEqual(reminders, ['0 · 4 · 7 semitonos', '0 · 3 · 7 semitonos']);
});

test('las notas objetivo son terceras mayores en sus cuerdas y trastes declarados', () => {
  const thirds = session6.exercises[0].steps[0].examples;
  const openStrings = { G: 7, B: 11, e: 4 };
  const classes = { D: 2, C: 0, G: 7, 'F♯': 6, E: 4, B: 11 };
  for (const third of thirds) {
    const [chord, note] = third.label.split(' → ');
    const [string, fret] = third.value.split(' · traste ');
    const pitch = (openStrings[string] + Number(fret)) % 12;
    assert.equal(pitch, classes[note]);
    assert.equal((pitch - classes[chord] + 12) % 12, 4);
  }
});

test('los recursos conservan los vídeos indicados y acotan el primer nivel instrumental', () => {
  assert.equal(session4.resources[0].youtubeId, 'UDXEciRSGm8');
  assert.equal(session5.resources[0].youtubeId, 'sG_K8sGflBY');
  assert.equal(session5.resources[0].approximateDuration, '00:59–12:50 · nivel 1');
  assert.match(session5.resources[0].purpose, /introducción instrumental/);
  for (const session of sessions.slice(3)) {
    for (const resource of session.resources) {
      const url = new URL(`https://www.youtube.com/watch?v=${resource.youtubeId}`);
      assert.equal(url.hostname, 'www.youtube.com');
      assert.ok(resource.title && resource.author && resource.purpose);
      assert.equal(resource.required, false);
    }
  }
});

test('las canciones forman parte de la práctica y se separa la afinación de la coordinación', () => {
  assert.match(session4.exercises[2].title, /Sweet Child O' Mine/);
  assert.match(JSON.stringify(session4.exercises[2]), /E♭–A♭–D♭–G♭–B♭–e♭/);
  assert.match(session5.exercises[1].steps[0].examples[0].value, /C – D – Am – G/);
  assert.match(JSON.stringify(session5.exercises[2]), /No fuerces la melodía/);
  assert.match(JSON.stringify(session5.exercises[3]), /Evalúa afinación aparte/);
  assert.equal(session6.exercises[2].steps[0].examples[0].value, 'C – D – Am – G – D – C – Am – G');
});

test('todos los ejercicios nuevos guardan los tres estados y exportan sin alterar registros previos', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const getStorage = () => storage;
  // Simulate existing, differently formatted records, including the reported durations.
  const durations = [50, 50, 25];
  for (const [index, session] of sessions.slice(0, 3).entries()) {
    const progress = emptyProgress(session);
    progress.actualDuration = durations[index];
    progress.note = `Registro anterior ${index + 1}\n🎸 & F♯`;
    values.set(storageKey(session.id), JSON.stringify(progress, null, 4));
  }
  values.set('other-app', 'unrelated');
  const before = new Map(values);
  for (const session of sessions.slice(3)) {
    const progress = emptyProgress(session);
    for (const exercise of session.exercises) {
      for (const state of Object.keys(exerciseStates)) {
        progress.exercises[exercise.id] = state;
        assert.equal(saveProgress(session, progress, getStorage).error, null);
        assert.deepEqual(loadProgress(session, getStorage).progress, progress);
      }
    }
    progress.actualDuration = 12;
    progress.note = 'Primera práctica';
    saveProgress(session, progress, getStorage);
    progress.actualDuration = 30;
    progress.note = 'Retomado otro día\ntercera → F♯';
    saveProgress(session, progress, getStorage);
    assert.deepEqual(loadProgress(session, getStorage).progress, progress);
  }
  const beforeExport = [...values];
  const data = createProgressExport(sessions, getStorage, new Date('2026-10-13T18:00:00Z'));
  assert.deepEqual(data.sessions.map(({ sessionId }) => sessionId), sessions.map(({ id }) => id));
  assert.deepEqual(data.sessions.slice(0, 3).map(({ progress }) => progress.actualDuration), durations);
  for (const result of data.sessions.slice(3)) {
    const content = sessions.find(({ id }) => id === result.sessionId);
    assert.equal(result.title, content.title);
    assert.deepEqual(result.block, content.block);
    assert.deepEqual(result.week, content.week);
    assert.equal(result.sessionNumber, content.number);
    assert.equal(result.progress.actualDuration, 30);
    assert.equal(result.progress.note, 'Retomado otro día\ntercera → F♯');
    assert.deepEqual(result.progress.exercises, Object.fromEntries(content.exercises.map(({ id }) => [id, 'comfortable'])));
  }
  assert.deepEqual([...values], beforeExport);
  for (const [key, value] of before) assert.equal(values.get(key), value);
  assert.doesNotMatch(JSON.stringify(data), /unrelated/);
});
