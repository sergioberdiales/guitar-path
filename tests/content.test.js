import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contentRoot = '../public/content/course/block-01/week-01/';
const catalog = JSON.parse(readFileSync(new URL(`${contentRoot}index.json`, import.meta.url), 'utf8'));
const sessions = catalog.sessions.map((filename) => JSON.parse(readFileSync(new URL(`${contentRoot}${filename}`, import.meta.url), 'utf8')));
const [session, session2, session3] = sessions;

test('el catálogo declara las tres sesiones en orden y todas cumplen el contrato de contenido', () => {
  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(catalog.sessions, ['session-01.json', 'session-02.json', 'session-03.json']);
  assert.deepEqual(sessions.map(({ number }) => number), [1, 2, 3]);
  assert.deepEqual(sessions.map(({ id }) => id), [
    'block-01-week-01-session-01',
    'block-01-week-01-session-02',
    'block-01-week-01-session-03',
  ]);

  const allIds = [];
  for (const knownSession of sessions) {
    assert.equal(knownSession.schemaVersion, 1);
    assert.deepEqual(knownSession.block, { number: 1, title: 'Entender el mástil' });
    assert.deepEqual(knownSession.week, { number: 1, title: 'Notas e intervalos' });
    assert.match(knownSession.estimatedDuration, /^\d+–\d+ min$/);
    assert.ok(knownSession.objective);
    assert.ok(knownSession.introduction.text);
    assert.ok(Array.isArray(knownSession.resources));
    assert.equal(knownSession.exercises.length, 5);
    assert.ok(knownSession.closing.noteQuestion);
    assert.ok(knownSession.closing.statusHelp);
    for (const exercise of knownSession.exercises) {
      assert.match(exercise.id, /^[a-z][a-z0-9-]*$/);
      assert.ok(exercise.title);
      assert.ok(exercise.explanation);
      assert.ok(exercise.approximateDuration);
      assert.ok(exercise.steps.length);
      assert.ok(exercise.completion.length);
      allIds.push(exercise.id);
    }
  }
  assert.equal(new Set(allIds).size, allIds.length, 'Los IDs de ejercicio deben ser únicos en el curso');
});

test('el contenido de la primera sesión tiene la información necesaria para practicar', () => {
  assert.equal(session.schemaVersion, 1);
  assert.equal(session.block.number, 1);
  assert.equal(session.week.number, 1);
  assert.equal(session.number, 1);
  for (const field of ['id', 'title', 'estimatedDuration', 'objective']) assert.ok(session[field]);
  assert.ok(session.introduction.text);
  assert.ok(session.closing.noteQuestion);
  assert.ok(session.closing.statusHelp);
  assert.equal(session.exercises.length, 5);
  const ids = session.exercises.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, 'Los IDs deben ser únicos para conservar el progreso');
  for (const exercise of session.exercises) {
    assert.match(exercise.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(exercise.title);
    assert.ok(exercise.explanation);
    assert.ok(exercise.approximateDuration);
    assert.ok(exercise.steps.length);
    assert.ok(exercise.completion.length);
  }
});

test('los recursos indicados son opcionales y conservan los vídeos suministrados', () => {
  assert.deepEqual(session.resources.map(({ youtubeId }) => youtubeId), ['qWS22cV9REg', 'rh6HEF5Dy2I']);
  for (const resource of session.resources) {
    assert.equal(resource.required, false);
    assert.ok(resource.author);
    assert.ok(resource.purpose);
  }
});

test('las respuestas de D están en soluciones desplegables, sin filtrarse en el enunciado o criterio', () => {
  const exercise = session.exercises.find(({ id }) => id === 'build-d-triads');
  assert.equal(exercise.steps.length, 2);
  assert.equal(exercise.steps[0].solution.examples[0].value, 'D – F♯ – A');
  assert.equal(exercise.steps[1].solution.examples[0].value, 'D – F – A');
  const visibleContent = { ...exercise, steps: exercise.steps.map(({ solution, ...prompt }) => prompt) };
  assert.doesNotMatch(JSON.stringify(visibleContent), /F♯|D – F – A/);
});

test('la sesión 2 trabaja distancias desde A y C y termina en una aplicación musical', () => {
  assert.equal(session2.title, 'De la nota al intervalo');
  assert.equal(session2.estimatedDuration, '30–35 min');
  assert.deepEqual(session2.resources, []);
  assert.deepEqual(session2.exercises.map(({ id }) => id), [
    'recall-triads',
    'root-distances-a',
    'move-root-c',
    'interval-before-note',
    'play-intervals-in-progression',
  ]);
  assert.match(session2.exercises.at(-1).steps[0].examples[0].value, /G – C – Em – D/);
  assert.match(session2.exercises.at(-1).completion[0], /Mantienes la progresión/);
});

test('la sesión 3 convierte la tríada de D en una forma transportable y musical', () => {
  assert.equal(session3.title, 'Ver tríadas dentro del mástil');
  assert.equal(session3.estimatedDuration, '30–35 min');
  assert.deepEqual(session3.resources, []);
  const [recall, find, change, transport, music] = session3.exercises;
  assert.ok(recall.steps[0].solution, 'La recuperación debe ocultar las respuestas');
  assert.match(find.steps[0].examples[0].detail, /5–1–3/);
  assert.match(change.steps[0].solution.examples[1].detail, /5–1–♭3/);
  assert.match(transport.steps[0].solution.examples[0].value, /B–E–G♯/);
  assert.match(music.steps[0].examples[0].value, /G – C – Em – D/);
  assert.match(music.completion[0], /sin perder por completo el pulso/);
});
