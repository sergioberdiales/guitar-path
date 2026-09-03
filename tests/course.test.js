import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSession, sessionHref } from '../src/course.js';

const sessions = [
  { id: 'block-01-week-01-session-01' },
  { id: 'block-01-week-01-session-02' },
  { id: 'block-01-week-01-session-03' },
];

test('la URL raíz sigue abriendo la sesión 1', () => {
  assert.equal(resolveSession(sessions, '').id, sessions[0].id);
});

test('el parámetro estable abre las sesiones 2 y 3 sin usar rutas del servidor', () => {
  assert.equal(resolveSession(sessions, `?session=${sessions[1].id}`).id, sessions[1].id);
  assert.equal(resolveSession(sessions, `?session=${sessions[2].id}&from=practice`).id, sessions[2].id);
  assert.equal(sessionHref(sessions[1].id, '/guitar-path/'), `/guitar-path/?session=${sessions[1].id}`);
});

test('un parámetro desconocido vuelve de forma segura a la primera sesión', () => {
  assert.equal(resolveSession(sessions, '?session=unknown').id, sessions[0].id);
  assert.equal(resolveSession([], '?session=unknown'), null);
});
