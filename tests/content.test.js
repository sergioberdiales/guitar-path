import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const session = JSON.parse(readFileSync(new URL('../public/content/course/block-01/week-01/session-01.json', import.meta.url), 'utf8'));

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
